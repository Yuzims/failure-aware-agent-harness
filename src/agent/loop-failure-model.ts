import { randomUUID } from "node:crypto";
import type { Task, ToolResult } from "../core/types.js";
import type { HistoryMessage, Model, ModelContext, ModelResponse } from "./model.js";

// 死循环调同一个工具，用来走 loop_failure → stop。
export class LoopFailureModel implements Model {
  async decide(
    _task: Task,
    _history: HistoryMessage[],
    _toolResults: ToolResult[],
    _context: ModelContext = { attempt: 1 },
  ): Promise<ModelResponse> {
    return {
      type: "tool_call",
      call: {
        id: randomUUID(),
        name: "calculator",
        arguments: { expression: "1 + 1" },
      },
    };
  }
}
