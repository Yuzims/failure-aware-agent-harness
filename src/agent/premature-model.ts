import { randomUUID } from "node:crypto";
import type { Task, ToolResult } from "../core/types.js";
import type { HistoryMessage, Model, ModelContext, ModelResponse } from "./model.js";

function products(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `商品${String.fromCharCode(65 + index)}`,
  }));
}

function existingItemCount(
  workspace: ModelContext["workspace"],
  path: string,
): number {
  const raw = workspace?.readFile(path);
  if (!raw) {
    return 0;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

// 工作区是空的就偷懒只写 3 个；已经有不完整产物就补到任务要求的数量。
export class PrematureCompletionModel implements Model {
  private lastAttempt = 0;
  private calledThisAttempt = false;

  async decide(
    task: Task,
    _history: HistoryMessage[],
    toolResults: ToolResult[],
    context: ModelContext = { attempt: 1 },
  ): Promise<ModelResponse> {
    if (context.attempt !== this.lastAttempt) {
      this.lastAttempt = context.attempt;
      this.calledThisAttempt = false;
    }

    if (!this.calledThisAttempt) {
      this.calledThisAttempt = true;
      const path = task.expected?.file ?? "result.json";
      const needed = task.expected?.itemCount ?? 5;
      const have = existingItemCount(context.workspace, path);
      const count = have > 0 ? needed : 3;

      return {
        type: "tool_call",
        call: {
          id: randomUUID(),
          name: "write_json",
          arguments: {
            path,
            data: products(count),
          },
        },
      };
    }

    const latest = toolResults.at(-1);
    if (!latest?.success) {
      return {
        type: "final",
        message: `工具执行失败：${latest?.error ?? "unknown error"}`,
      };
    }

    const itemCount =
      latest.output &&
      typeof latest.output === "object" &&
      "itemCount" in latest.output
        ? (latest.output as { itemCount: number }).itemCount
        : undefined;

    return {
      type: "final",
      message: `已经完成，result.json 里有 ${itemCount ?? "若干"} 个商品。`,
    };
  }
}
