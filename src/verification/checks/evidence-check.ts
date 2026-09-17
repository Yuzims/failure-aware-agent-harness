import type { Check, VerificationCheck, VerifyContext } from "../types.js";

export class EvidenceCheck implements Check {
  readonly name = "evidence";

  run(ctx: VerifyContext): VerificationCheck | null {
    const expected = ctx.task.expected?.minRelevant;
    if (expected === undefined) {
      return null;
    }

    const actual =
      ctx.workspace.lastRetrieval?.hits.filter((hit) => hit.relevant).length ?? 0;
    const passed = actual >= expected;

    return {
      name: this.name,
      passed,
      expected,
      actual,
      reason: passed
        ? `相关文档 ${actual} 条，达到 ${expected} 条`
        : `相关文档要求 ${expected} 条，实际 ${actual} 条`,
    };
  }
}
