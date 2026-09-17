import type { Check, VerificationCheck, VerifyContext } from "../types.js";

export class FileExistsCheck implements Check {
  readonly name = "file_exists";

  run(ctx: VerifyContext): VerificationCheck | null {
    const file = ctx.task.expected?.file;
    if (!file) {
      return null;
    }

    const exists = ctx.workspace.exists(file);

    return {
      name: this.name,
      passed: exists,
      expected: file,
      actual: exists ? file : undefined,
      reason: exists ? `文件存在：${file}` : `任务要求生成 ${file}，实际不存在`,
    };
  }
}
