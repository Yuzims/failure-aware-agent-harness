import type { Check, VerificationCheck, VerifyContext } from "../types.js";

export class ToolResultCheck implements Check {
  readonly name = "tool_result";

  run(ctx: VerifyContext): VerificationCheck {
    const toolResults = ctx.events.filter((event) => event.type === "tool_result");
    const failed = toolResults.filter((event) => event.data.success === false);

    return {
      name: this.name,
      passed: failed.length === 0,
      expected: "所有 tool_result.success === true",
      actual: {
        total: toolResults.length,
        failed: failed.length,
      },
      reason:
        failed.length === 0
          ? `工具调用全部成功（${toolResults.length} 次）`
          : `有 ${failed.length} 次工具调用失败`,
    };
  }
}
