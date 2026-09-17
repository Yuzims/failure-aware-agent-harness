import { appendAttempt, createInvestigationRun, createInvestigationTask } from "../domain/index.js";
import type { InvestigationTask } from "../domain/index.js";
import type { Model, ModelContext, ModelResponse } from "../agent/model.js";
import { AgentLoop } from "../agent/agent-loop.js";
import { OpenAICompatModel } from "../agent/openai-compat-model.js";
import { readLlmConfig } from "../agent/llm-config.js";
import type { HistoryMessage } from "../agent/model.js";
import type { Task, ToolResult } from "../core/types.js";
import type { GitHubDataProvider } from "../github/provider.js";
import { ToolRegistry } from "../tools/tool-registry.js";
import { TraceCollector } from "../trace/trace-collector.js";
import { createInvestigationToolList } from "./investigation-tools.js";
import type { InvestigationSession } from "./investigation-tools.js";
import {
  toAgentReport,
  type InvestigationActor,
  type InvestigationAgentReport,
} from "./investigation-report.js";
import { INVESTIGATION_SYSTEM_PROMPT } from "./policy.js";
import { formatStateForModel, InvestigationState } from "./state.js";
import { SnapshotInvestigationDriver, TEST_DRIVER_NOTICE } from "./test-driver.js";

export interface InvestigateInput {
  owner: string;
  repository: string;
  issueNumber: number;
  question?: InvestigationTask["question"];
  description?: string;
}

export interface InvestigateOptions {
  task: InvestigationTask | InvestigateInput;
  provider: GitHubDataProvider;
  trace?: TraceCollector;
  maxSteps?: number;
  /** Injected model (tests / LLM). */
  model?: Model;
  /**
   * Use the deterministic snapshot test driver.
   * This is NOT a real Investigation Agent — tests and offline fixtures only.
   */
  useTestDriver?: boolean;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}

class InvestigationLoopModel implements Model {
  constructor(
    private readonly inner: Model,
    private readonly session: InvestigationSession,
    private readonly injectState: boolean,
  ) {}

  async decide(
    task: Task,
    history: HistoryMessage[],
    toolResults: ToolResult[],
    context?: ModelContext,
  ): Promise<ModelResponse> {
    this.session.state.currentStep += 1;
    const nextHistory =
      this.injectState && history.length > 0
        ? [...history, { role: "user" as const, content: formatStateForModel(this.session.state) }]
        : history;
    const response = await this.inner.decide(task, nextHistory, toolResults, context);
    if (response.type === "tool_call") {
      const reason =
        this.session.state.consumeReason() ??
        `Model chose ${response.call.name} after ${this.session.state.toolHistory.length} tool observation(s).`;
      this.session.state.lastDecisionReason = reason;
      this.session.trace.record(this.session.runId, this.session.state.currentStep, "agent_step", {
        tool: response.call.name,
        arguments: response.call.arguments,
        reason,
        evidenceIds: this.session.state.run.evidence.map((item) => item.id),
        candidatePrs: [...this.session.state.candidatePrs],
        unresolvedQuestions: [...this.session.state.unresolvedQuestions],
        investigatedResources: [...this.session.state.investigatedResources],
      });
    }
    return response;
  }
}

function asTask(input: InvestigationTask | InvestigateInput): InvestigationTask {
  if ("target" in input && "id" in input && "question" in input) {
    return input;
  }
  return createInvestigationTask({
    target: {
      owner: input.owner,
      repository: input.repository,
      issueNumber: input.issueNumber,
    },
    question: input.question,
    description: input.description,
  });
}

function resolveActorAndModel(input: {
  options: InvestigateOptions;
  state: InvestigationState;
  tools: Array<{ name: string; description: string; parameters?: Record<string, unknown> }>;
}): { actor: InvestigationActor; model: Model | undefined; notice?: string } {
  if (input.options.useTestDriver) {
    return {
      actor: "test_driver",
      model: new SnapshotInvestigationDriver(input.state),
      notice: TEST_DRIVER_NOTICE,
    };
  }
  if (input.options.model) {
    return { actor: "llm", model: input.options.model };
  }
  const config = readLlmConfig(input.options.env ?? process.env);
  if (config.kind === "openai" && config.apiKey) {
    return {
      actor: "llm",
      model: new OpenAICompatModel({
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        model: config.model,
        tools: input.tools,
        fetchImpl: input.options.fetchImpl,
        systemPrompt: INVESTIGATION_SYSTEM_PROMPT,
      }),
    };
  }
  return { actor: "unconfigured", model: undefined };
}

function unconfiguredReport(state: InvestigationState): InvestigationAgentReport {
  state.run.status = "not_verified";
  state.run.endedAt = new Date().toISOString();
  state.addQuestion("LLM is not configured; investigation did not run.");
  const report = toAgentReport({ state, actor: "unconfigured", status: "unconfigured" });
  report.report.conclusion =
    "Investigation Agent is unconfigured: no OpenAI-compatible API key. Not running WorkspaceAgentModel / keyword classifier. SnapshotInvestigationDriver is a test fixture only (pass useTestDriver: true).";
  report.report.uncertainty =
    "No autonomous investigation was performed. This is not a real Investigation Agent result.";
  return report;
}

/**
 * Run a bounded GitHub investigation.
 * Reuses AgentLoop + ToolRegistry + TraceCollector. Does not rewrite the loop.
 * Never sets InvestigationRun.status to verified_complete.
 */
export async function investigate(options: InvestigateOptions): Promise<InvestigationAgentReport> {
  const task = asTask(options.task);
  const trace = options.trace ?? new TraceCollector();
  const run = createInvestigationRun({ task });
  const state = new InvestigationState(task, run);
  const session: InvestigationSession = { state, trace, runId: run.id };
  const tools = createInvestigationToolList(options.provider, session);
  const registry = new ToolRegistry();
  for (const tool of tools) {
    registry.register(tool);
  }

  trace.record(run.id, 0, "investigation_started", {
    taskId: task.id,
    target: task.target,
    question: task.question,
    description: task.description,
  });

  const resolved = resolveActorAndModel({
    options,
    state,
    tools: tools.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    })),
  });

  if (!resolved.model) {
    const report = unconfiguredReport(state);
    trace.record(run.id, 0, "investigation_completed", {
      status: report.status,
      actor: report.actor,
      notice: report.report.conclusion,
      verifiedComplete: false,
    });
    return report;
  }

  const loopModel = new InvestigationLoopModel(
    resolved.model,
    session,
    resolved.actor === "llm",
  );
  const loop = new AgentLoop(loopModel, registry, trace, options.maxSteps ?? 12);
  const coreTask: Task = {
    id: task.id,
    description: [
      `Investigate ${task.target.owner}/${task.target.repository}#${task.target.issueNumber}.`,
      task.description,
      "Use read-only GitHub investigation tools, then record_claim.",
      "Do not declare VERIFIED_COMPLETE.",
    ].join(" "),
  };

  const agentResult = await loop.run(coreTask, run.id, { attempt: 1 });
  const endedAt = new Date().toISOString();
  // Agent hypotheses only. Verification is Phase 4.
  run.status = "not_verified";
  run.endedAt = endedAt;

  const report = toAgentReport({
    state,
    actor: resolved.actor,
    agentResult,
  });

  const attempt = appendAttempt(run, {
    startedAt: run.startedAt,
    endedAt,
    agentConclusion: report.report.conclusion,
    report: report.report,
    evidenceIds: report.evidence.map((item) => item.id),
    claimIds: report.claims.map((item) => item.id),
  });
  report.run.attempts = attempt.attempts;

  trace.record(run.id, state.currentStep, "investigation_completed", {
    status: report.status,
    actor: report.actor,
    steps: report.investigationSteps.length,
    evidenceIds: report.evidence.map((item) => item.id),
    claimIds: report.claims.map((item) => item.id),
    claimEvidence: report.claimEvidence,
    unresolvedQuestions: report.unresolvedQuestions,
    polarity: report.report.polarity,
    verifiedComplete: false,
    notice: resolved.notice,
  });

  return report;
}

export class InvestigationAgent {
  constructor(private readonly defaults: Omit<InvestigateOptions, "task" | "provider"> = {}) {}

  run(
    task: InvestigationTask | InvestigateInput,
    provider: GitHubDataProvider,
    options: Partial<InvestigateOptions> = {},
  ): Promise<InvestigationAgentReport> {
    return investigate({
      ...this.defaults,
      ...options,
      task,
      provider,
    });
  }
}
