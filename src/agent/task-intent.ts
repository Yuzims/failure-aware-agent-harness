import type { Task, TaskExpectation } from "../core/types.js";
import { TRANSFORMER_QUERY } from "../retrieval/qrels.js";

export type TaskKind = "write" | "search" | "calc" | "github" | "unknown";

export function classifyTask(description: string): TaskKind {
  const text = description.toLowerCase();
  if (
    /github|仓库|开源|热门.?agent|agent.?项目/.test(text) &&
    !/transformer|论文/.test(text)
  ) {
    return "github";
  }
  if (/商品|json|result\.json|写入|写一个文件/.test(text)) {
    return "write";
  }
  if (/检索|搜索|search|transformer|资料|论文/.test(text)) {
    return "search";
  }
  if (/计算|计算器|\d+\s*[+\-×x*/]\s*\d+/.test(text)) {
    return "calc";
  }
  return "unknown";
}

export function extractItemCount(description: string): number {
  const match = description.match(/(\d+)\s*个/);
  if (match) {
    return Number(match[1]);
  }
  if (description.includes("五")) {
    return 5;
  }
  return 5;
}

export function extractExpression(description: string): string {
  const match = description.replaceAll("×", "*").replaceAll("x", "*").match(
    /(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)/,
  );
  if (!match) {
    return "123 * 456";
  }
  return `${match[1]} ${match[2]} ${match[3]}`;
}

export function extractSearchQuery(description: string): string {
  if (/transformer/i.test(description)) {
    return TRANSFORMER_QUERY;
  }
  return description.replace(/检索|搜索|相关资料|至少.*条.*/g, "").trim() || TRANSFORMER_QUERY;
}

export function inferTask(description: string): Task {
  const kind = classifyTask(description);
  const task: Task = { id: "agent", description };
  let expected: TaskExpectation | undefined;

  if (kind === "write") {
    expected = {
      file: "result.json",
      itemCount: extractItemCount(description),
    };
  } else if (kind === "search") {
    expected = {
      minRelevant: 3,
      query: extractSearchQuery(description),
    };
  }

  if (expected) {
    task.expected = expected;
  }
  return task;
}

export const AGENT_EXAMPLES = [
  {
    label: "写 5 个商品",
    description: "创建 result.json，里面必须有 5 个商品。",
  },
  {
    label: "检索 Transformer",
    description: "检索 Transformer 相关资料，至少 3 条相关结果。",
  },
  {
    label: "计算 123 × 456",
    description: "计算 123 × 456。",
  },
  {
    label: "GitHub 热门 Agent",
    description:
      "在 GitHub 上查找最近一个月和 Agent / harness 相关的热门仓库，列出项目名、星标和一句话用途。不要用本地论文检索。",
  },
] as const;
