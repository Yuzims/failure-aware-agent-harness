import type { Tool } from "./tool.js";

export const calculatorTool: Tool = {
  name: "calculator",
  description: "Perform a basic arithmetic calculation.",
  parameters: {
    type: "object",
    properties: {
      expression: {
        type: "string",
        description: "Arithmetic expression using + - * / ( )",
      },
    },
    required: ["expression"],
  },

  async execute(args) {
    const expression = args.expression;

    if (typeof expression !== "string") {
      throw new Error("expression must be a string");
    }

    // 第一版只用来证明 Tool Calling 能跑通，正式环境不能这么执行模型输入
    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      throw new Error("unsupported expression");
    }

    const result = Function(`"use strict"; return (${expression})`)();

    if (typeof result !== "number" || !Number.isFinite(result)) {
      throw new Error("calculation did not produce a finite number");
    }

    return result;
  },
};
