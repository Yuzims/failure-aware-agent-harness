import { randomUUID } from "node:crypto";
import type { Task, ToolResult } from "../core/types.js";
import type { RetrievedDoc } from "../core/workspace.js";
import { TRANSFORMER_QUERY } from "../retrieval/qrels.js";
import type { HistoryMessage, Model, ModelContext, ModelResponse } from "./model.js";

function searchHits(output: unknown): RetrievedDoc[] {
  if (!output || typeof output !== "object" || !("hits" in output)) {
    return [];
  }
  const hits = (output as { hits?: RetrievedDoc[] }).hits;
  return Array.isArray(hits) ? hits : [];
}

// 搜完看命中：相关条数够才引用标题；不够仍然喊完成，用来走 retrieval_failure。
export class RetrievalFailureModel implements Model {
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
      return {
        type: "tool_call",
        call: {
          id: randomUUID(),
          name: "search",
          arguments: {
            query: task.expected?.query ?? TRANSFORMER_QUERY,
          },
        },
      };
    }

    const latest = toolResults.at(-1);
    if (!latest?.success) {
      return {
        type: "final",
        message: `检索失败：${latest?.error ?? "unknown error"}`,
      };
    }

    const minRelevant = task.expected?.minRelevant ?? 3;
    const relevant = searchHits(latest.output).filter((hit) => hit.relevant);

    if (relevant.length >= minRelevant) {
      return {
        type: "final",
        message: `已经完成。引用：${relevant.map((hit) => hit.title).join("；")}`,
      };
    }

    return {
      type: "final",
      message: "已经完成，相关资料都找到了。",
    };
  }
}
