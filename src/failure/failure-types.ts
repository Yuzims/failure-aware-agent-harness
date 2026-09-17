export const MAX_STEPS_REACHED = "Maximum step limit reached.";

export type FailureType =
  | "tool_failure"
  | "retrieval_failure"
  | "premature_completion"
  | "loop_failure"
  | "unknown";

export interface Failure {
  type: FailureType;
  rootCause: string;
  evidence: unknown[];
}
