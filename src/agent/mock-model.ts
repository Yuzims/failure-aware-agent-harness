import { randomUUID } from "node:crypto";
import type { Task, ToolResult } from "../core/types.js";
import type { HistoryMessage, Model, ModelResponse } from "./model.js";

export class MockModel implements Model {
  private called = false;

  async decide(
    _task: Task,
    _history: HistoryMessage[],
    toolResults: ToolResult[],
  ): Promise<ModelResponse> {
    // 第一次固定调计算器，方便验证 Harness，不依赖真实 LLM
    if (!this.called) {
      this.called = true;

      return {
        type: "tool_call",
        call: {
          id: randomUUID(),
          name: "calculator",
          arguments: {
            expression: "123 * 456",
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
      message: `计算完成：123 × 456 = ${latest.output}`,
    };
  }
}
