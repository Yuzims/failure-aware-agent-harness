import type {
  AblationRowDTO,
  AttemptDTO,
  BenchmarkMode,
  EventDTO,
  RunDTO,
} from "../api/dto.js";
import type { HarnessRun } from "../core/harness.js";
import type { ScenarioCase } from "../eval/cases.js";
import type { AblationRow } from "../retrieval/ablation.js";
import type { TraceEvent } from "../trace/trace-collector.js";

function eventSummary(event: TraceEvent): string {
  const data = event.data;
  if (event.type === "tool_call") {
    return `${String(data.tool ?? "")} ${JSON.stringify(data.arguments ?? {})}`;
  }
  if (event.type === "tool_result") {
    return data.success === false
      ? `fail: ${String(data.error ?? "")}`
      : "success";
  }
  if (event.type === "verification") {
    return String(data.status ?? "");
  }
  if (event.type === "failure") {
    return `${String(data.type ?? "")} (${String(data.rootCause ?? "")})`;
  }
  if (event.type === "recovery") {
    return `${String(data.action ?? "")} — ${String(data.reason ?? "")}`;
  }
  if (event.type === "run_completed") {
    return String(data.message ?? "");
  }
  return "";
}

export function toEventDTO(event: TraceEvent): EventDTO {
  return {
    step: event.step,
    type: event.type,
    summary: eventSummary(event),
  };
}

export function toAttemptDTO(run: HarnessRun): AttemptDTO[] {
  return run.attempts.map((snapshot) => ({
    attempt: snapshot.attempt,
    agentOutput: String(snapshot.result.output ?? ""),
    verifier: snapshot.verification.status,
    prematureCompletion: snapshot.verification.prematureCompletion,
    checks: snapshot.verification.checks.map((check) => ({
      name: check.name,
      passed: check.passed,
      reason: check.reason,
      expected: check.expected,
      actual: check.actual,
    })),
    failureType: snapshot.failure?.type,
    failureRootCause: snapshot.failure?.rootCause,
    recoveryAction: snapshot.recovery?.action,
    recoveryReason: snapshot.recovery?.reason,
  }));
}

export function toRunView(
  scenarioId: string,
  title: string,
  mode: BenchmarkMode,
  run: HarnessRun,
): RunDTO {
  return {
    runId: run.runId,
    scenarioId,
    title,
    mode,
    finalPass: run.verification.status === "pass",
    recoveryCount: run.recoveryCount,
    modelCalls: run.modelCalls,
    toolCalls: run.toolCalls,
    latencyMs: run.latencyMs,
    attempts: toAttemptDTO(run),
    events: run.trace.map(toEventDTO),
  };
}

export function toRunDTO(
  item: ScenarioCase,
  mode: BenchmarkMode,
  run: HarnessRun,
): RunDTO {
  return toRunView(item.id, item.title, mode, run);
}

export function toAblationDTO(rows: AblationRow[]): AblationRowDTO[] {
  return rows.map((row) => ({
    strategy: row.strategy,
    query: row.query,
    precisionAt3: row.precisionAt3,
    relevantCount: row.relevantCount,
    hits: row.hits.map((hit) => ({
      id: hit.id,
      title: hit.title,
      score: hit.score,
      relevant: hit.relevant,
    })),
  }));
}
