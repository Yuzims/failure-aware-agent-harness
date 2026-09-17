import { randomUUID } from "node:crypto";
import type { Task, ToolResult } from "../core/types.js";
import type { RetrievedDoc } from "../core/workspace.js";
import type { HistoryMessage, Model, ModelContext, ModelResponse } from "./model.js";
import {
  classifyTask,
  extractExpression,
  extractItemCount,
} from "./task-intent.js";

function products(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    name: `商品${String.fromCharCode(65 + index)}`,
  }));
}

function searchHits(output: unknown): RetrievedDoc[] {
  if (!output || typeof output !== "object" || !("hits" in output)) {
    return [];
  }
  const hits = (output as { hits?: RetrievedDoc[] }).hits;
  return Array.isArray(hits) ? hits : [];
}

// 工作台 Agent：按任务调工具。检索不够仍可能喊完成，交给 Harness 换策略。
export class WorkspaceAgentModel implements Model {
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

    const kind = classifyTask(task.description);

    if (!this.calledThisAttempt) {
      this.calledThisAttempt = true;
      if (kind === "write") {
        const count = task.expected?.itemCount ?? extractItemCount(task.description);
        return {
          type: "tool_call",
          call: {
            id: randomUUID(),
            name: "write_json",
            arguments: {
              path: task.expected?.file ?? "result.json",
              data: products(count),
            },
          },
        };
      }
      if (kind === "search") {
        return {
          type: "tool_call",
          call: {
            id: randomUUID(),
            name: "search",
            arguments: { query: task.expected?.query ?? task.description },
          },
        };
      }
      if (kind === "calc") {
        return {
          type: "tool_call",
          call: {
            id: randomUUID(),
            name: "calculator",
            arguments: { expression: extractExpression(task.description) },
          },
        };
      }
      if (kind === "github") {
        return {
          type: "tool_call",
          call: {
            id: randomUUID(),
            name: "github_search",
            arguments: {
              query: "AI agent harness",
              sinceDays: /一个月|30\s*天|last month/i.test(task.description) ? 30 : undefined,
              sort: "stars",
            },
          },
        };
      }
      return {
        type: "final",
        message:
          "目前支持：写 JSON、本地论文检索、GitHub 仓库检索、四则运算。不能爬牛客或任意网页。",
      };
    }

    const latest = toolResults.at(-1);
    if (!latest?.success) {
      return {
        type: "final",
        message: `工具执行失败：${latest?.error ?? "unknown error"}`,
      };
    }

    if (kind === "search") {
      const minRelevant = task.expected?.minRelevant ?? 3;
      const relevant = searchHits(latest.output).filter((hit) => hit.relevant);
      if (relevant.length >= minRelevant) {
        return {
          type: "final",
          message: `检索完成。引用：${relevant.map((hit) => hit.title).join("；")}`,
        };
      }
      return {
        type: "final",
        message: "已经完成，相关资料都找到了。",
      };
    }

    if (kind === "write") {
      const itemCount =
        latest.output && typeof latest.output === "object" && "itemCount" in latest.output
          ? (latest.output as { itemCount: number }).itemCount
          : undefined;
      return {
        type: "final",
        message: `已经写入 ${itemCount ?? "若干"} 条到工作区。`,
      };
    }

    if (kind === "github") {
      const repos =
        latest.output && typeof latest.output === "object" && "repos" in latest.output
          ? (latest.output as { repos?: Array<{ fullName?: string; stars?: number; description?: string; url?: string }> })
              .repos ?? []
          : [];
      if (!repos.length) {
        return { type: "final", message: "GitHub 没有返回仓库。" };
      }
      const lines = repos
        .slice(0, 8)
        .map(
          (repo) =>
            `${repo.fullName} ★${repo.stars} ${repo.description || ""} ${repo.url || ""}`.trim(),
        );
      return {
        type: "final",
        message: `GitHub 检索完成：\n${lines.join("\n")}`,
      };
    }

    return {
      type: "final",
      message: `计算完成：${String(latest.output)}`,
    };
  }
}
