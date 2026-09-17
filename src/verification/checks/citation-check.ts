import type { Check, VerificationCheck, VerifyContext } from "../types.js";

export class CitationCheck implements Check {
  readonly name = "citation";

  run(ctx: VerifyContext): VerificationCheck | null {
    const expected = ctx.task.expected?.minRelevant;
    if (expected === undefined) {
      return null;
    }

    const relevant =
      ctx.workspace.lastRetrieval?.hits.filter((hit) => hit.relevant) ?? [];
    if (relevant.length < expected) {
      return null;
    }

    const output = String(ctx.result.output ?? "");
    const cited = relevant.filter(
      (hit) => output.includes(hit.title) || output.includes(hit.id),
    );
    const passed = cited.length >= expected;

    return {
      name: this.name,
      passed,
      expected,
      actual: cited.length,
      reason: passed
        ? `终答引用了 ${cited.length} 条相关文档`
        : `召回了 ${relevant.length} 条相关文档，终答只引用了 ${cited.length} 条`,
    };
  }
}
