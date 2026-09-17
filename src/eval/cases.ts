import { LoopFailureModel } from "../agent/loop-failure-model.js";
import { PrematureCompletionModel } from "../agent/premature-model.js";
import { RetrievalFailureModel } from "../agent/retrieval-failure-model.js";
import { ToolFailureModel } from "../agent/tool-failure-model.js";
import type { Model } from "../agent/model.js";
import type { Task } from "../core/types.js";
import type { Workspace } from "../core/workspace.js";
import { calculatorTool } from "../tools/calculator.js";
import { createFlakyWriteJsonTool, createWriteJsonTool } from "../tools/write-json.js";
import { createSearchTool } from "../tools/search.js";
import { ToolRegistry } from "../tools/tool-registry.js";
import { TRANSFORMER_QUERY } from "../retrieval/qrels.js";

export interface ScenarioCase {
  id: string;
  title: string;
  expectedFailure: string;
  shouldFinallyPass: boolean;
  maxSteps?: number;
  task: Task;
  createModel: () => Model;
  registerTools: (tools: ToolRegistry, workspace: Workspace) => void;
}

export interface ScenarioInfo {
  id: string;
  title: string;
  expectedFailure: string;
  shouldFinallyPass: boolean;
  description: string;
}

export function listScenarios(): ScenarioInfo[] {
  return allCases().map((item) => ({
    id: item.id,
    title: item.title,
    expectedFailure: item.expectedFailure,
    shouldFinallyPass: item.shouldFinallyPass,
    description: item.task.description,
  }));
}

const productTask: Task = {
  id: "products",
  description: "创建 result.json，里面必须有 5 个商品。",
  expected: {
    file: "result.json",
    itemCount: 5,
  },
};

export function allCases(): ScenarioCase[] {
  return [
    {
      id: "premature",
      title: "提前完成 → 对症补全",
      expectedFailure: "premature_completion",
      shouldFinallyPass: true,
      task: productTask,
      createModel: () => new PrematureCompletionModel(),
      registerTools: (tools, workspace) => {
        tools.register(createWriteJsonTool(workspace));
      },
    },
    {
      id: "tool",
      title: "工具失败 → 再试一次",
      expectedFailure: "tool_failure",
      shouldFinallyPass: true,
      task: productTask,
      createModel: () => new ToolFailureModel(),
      registerTools: (tools, workspace) => {
        tools.register(createFlakyWriteJsonTool(workspace, 1));
      },
    },
    {
      id: "retrieval",
      title: "检索跑偏 → BM25 hybrid",
      expectedFailure: "retrieval_failure",
      shouldFinallyPass: true,
      task: {
        id: "retrieval",
        description: "检索 Transformer 相关资料，至少 3 条相关结果。",
        expected: { minRelevant: 3, query: TRANSFORMER_QUERY },
      },
      createModel: () => new RetrievalFailureModel(),
      registerTools: (tools, workspace) => {
        tools.register(createSearchTool(workspace));
      },
    },
    {
      id: "loop",
      title: "循环打转 → 停下来",
      expectedFailure: "loop_failure",
      shouldFinallyPass: false,
      maxSteps: 4,
      task: {
        id: "loop",
        description: "计算 1 + 1，但模型会一直调工具。",
      },
      createModel: () => new LoopFailureModel(),
      registerTools: (tools) => {
        tools.register(calculatorTool);
      },
    },
  ];
}
