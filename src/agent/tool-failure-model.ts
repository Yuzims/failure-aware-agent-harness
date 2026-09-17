import { randomUUID } from "node:crypto";
import type { Task, ToolResult } from "../core/types.js";
import type { HistoryMessage, Model, ModelContext, ModelResponse } from "./model.js";

// 商品内容是对的，但第一次写文件会失败，用来走 tool_failure → retry_tool。
export class ToolFailureModel implements Model {
  private lastAttempt = 0;
  private calledThisAttempt = false;

  async decide(
    _task: Task,
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
      return {
        type: "tool_call",
        call: {
          id: randomUUID(),
          name: "write_json",
          arguments: {
            path: "result.json",
            data: [
              { id: 1, name: "商品A" },
              { id: 2, name: "商品B" },
              { id: 3, name: "商品C" },
              { id: 4, name: "商品D" },
              { id: 5, name: "商品E" },
            ],
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

    return {
      type: "final",
      message: "已经完成，result.json 里有 5 个商品。",
    };
  }
}
