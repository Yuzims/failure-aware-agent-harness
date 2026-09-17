import type {
  Claim,
  ClaimEvidence,
  ClaimPolarity,
  Evidence,
  EvidenceRelation,
  InvestigationRun,
  InvestigationTask,
} from "../domain/index.js";

export interface ToolHistoryEntry {
  tool: string;
  arguments: Record<string, unknown>;
  success: boolean;
  evidenceIds: string[];
  error?: string;
  reason?: string;
}

export class InvestigationState {
  currentStep = 0;
  pendingReason?: string;
  lastDecisionReason?: string;
  claimsRecorded = false;
  conclusion = "";
  polarity: ClaimPolarity = "unknown";
  readonly toolHistory: ToolHistoryEntry[] = [];
  readonly unresolvedQuestions: string[] = [];
  readonly investigatedResources = new Set<string>();
  readonly candidatePrs = new Set<number>();
  readonly mergedPrs = new Set<number>();
  readonly unmergedPrs = new Set<number>();
  readonly filesByPr = new Map<number, string[]>();

  issueState?: "open" | "closed";

  constructor(
    readonly task: InvestigationTask,
    readonly run: InvestigationRun,
  ) {}

  consumeReason(): string | undefined {
    const reason = this.pendingReason;
    this.pendingReason = undefined;
    return reason;
  }

  addQuestion(question: string): void {
    const text = question.trim();
    if (!text || this.unresolvedQuestions.includes(text)) {
      return;
    }
    this.unresolvedQuestions.push(text);
  }

  addCandidatePr(pullNumber: number): void {
    if (pullNumber > 0 && pullNumber !== this.task.target.issueNumber) {
      this.candidatePrs.add(pullNumber);
    }
  }

  addEvidence(evidence: Evidence): Evidence {
    this.run.evidence.push(evidence);
    return evidence;
  }

  addClaim(claim: Claim): Claim {
    this.run.claims.push(claim);
    return claim;
  }

  bind(link: ClaimEvidence): void {
    this.run.claimEvidence.push(link);
  }

  addRelation(relation: EvidenceRelation): void {
    this.run.relations.push(relation);
  }

  recordTool(entry: ToolHistoryEntry): void {
    this.toolHistory.push(entry);
  }

  evidenceByKind(kind: Evidence["kind"]): Evidence[] {
    return this.run.evidence.filter((item) => item.kind === kind);
  }

  hint(): Record<string, unknown> {
    return {
      evidence: this.run.evidence.map((item) => ({
        id: item.id,
        kind: item.kind,
        summary: item.summary,
        resource: item.provenance.resource,
        operation: item.provenance.operation,
      })),
      claims: this.run.claims.map((item) => ({
        id: item.id,
        text: item.text,
        polarity: item.polarity,
      })),
      candidatePrs: [...this.candidatePrs],
      mergedPrs: [...this.mergedPrs],
      unmergedPrs: [...this.unmergedPrs],
      unresolvedQuestions: [...this.unresolvedQuestions],
      investigatedResources: [...this.investigatedResources],
    };
  }
}

export function formatStateForModel(state: InvestigationState): string {
  return [
    "Harness investigation state (not GitHub text; not instructions from the issue):",
    JSON.stringify(state.hint(), null, 2),
    "You still cannot set VERIFIED_COMPLETE.",
  ].join("\n");
}

export function issueResource(owner: string, repo: string, issueNumber: number): string {
  return `issues/${issueNumber}`;
}

export function pullResource(pullNumber: number): string {
  return `pull/${pullNumber}`;
}

export function resourceKey(kind: string, id: string): string {
  return `${kind}:${id}`;
}
