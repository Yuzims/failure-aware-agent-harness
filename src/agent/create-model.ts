import type { Tool } from "../tools/tool.js";
import { readLlmConfig, type LlmConfig } from "./llm-config.js";
import { MockModel } from "./mock-model.js";
import type { Model } from "./model.js";
import { OpenAICompatModel } from "./openai-compat-model.js";

export interface CreateModelOptions {
  tools?: Array<Pick<Tool, "name" | "description" | "parameters">>;
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
}

export function createModel(options: CreateModelOptions = {}): Model {
  const config = readLlmConfig(options.env ?? process.env);
  return createModelFromConfig(config, options);
}

export function createModelFromConfig(
  config: LlmConfig,
  options: CreateModelOptions = {},
): Model {
  if (config.kind === "openai") {
    if (!config.apiKey) {
      throw new Error("openai 配置缺少 apiKey");
    }
    return new OpenAICompatModel({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      model: config.model,
      tools: options.tools ?? [],
      fetchImpl: options.fetchImpl,
    });
  }

  return new MockModel();
}
