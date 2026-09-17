import type { Check, VerificationCheck, VerifyContext } from "../types.js";

function countItems(raw: string | undefined): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.length;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export class CountCheck implements Check {
  readonly name = "count";

  run(ctx: VerifyContext): VerificationCheck | null {
    const expected = ctx.task.expected?.itemCount;
    const file = ctx.task.expected?.file;
    if (expected === undefined || !file) {
      return null;
    }

    const actual = countItems(ctx.workspace.readFile(file));
    const passed = actual === expected;

    return {
      name: this.name,
      passed,
      expected,
      actual,
      reason: passed
        ? `${file} 中有 ${actual} 条，符合要求`
        : `${file} 要求 ${expected} 条，实际 ${actual ?? 0} 条`,
    };
  }
}
