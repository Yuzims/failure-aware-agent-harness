export type LlmKind = "mock" | "openai";

export interface LlmConfig {
  kind: LlmKind;
  apiKey?: string;
  baseUrl: string;
  model: string;
}

export interface LlmStatus {
  kind: LlmKind;
  model: string;
  ready: boolean;
  hint: string;
}

type Env = Record<string, string | undefined>;

function apiKeyOf(env: Env): string | undefined {
  const key = env.OPENAI_API_KEY ?? env.LLM_API_KEY;
  return key && key.trim() ? key.trim() : undefined;
}

export function readLlmConfig(env: Env = process.env): LlmConfig {
  const explicit = (env.AGENT_MODEL ?? "").trim().toLowerCase();
  const apiKey = apiKeyOf(env);
  const baseUrl = (env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = env.OPENAI_MODEL ?? env.LLM_MODEL ?? "gpt-4o-mini";

  if (explicit === "mock" || explicit === "workspace") {
    return { kind: "mock", baseUrl: "", model: "workspace" };
  }

  if (explicit === "openai" || explicit === "llm") {
    if (!apiKey) {
      throw new Error("AGENT_MODEL=openai 需要 OPENAI_API_KEY（或 LLM_API_KEY）");
    }
    return { kind: "openai", apiKey, baseUrl, model };
  }

  if (apiKey) {
    return { kind: "openai", apiKey, baseUrl, model };
  }

  return { kind: "mock", baseUrl: "", model: "workspace" };
}

export function describeLlm(env: Env = process.env): LlmStatus {
  try {
    const config = readLlmConfig(env);
    if (config.kind === "openai") {
      return {
        kind: "openai",
        model: config.model,
        ready: true,
        hint: `工作台走真模型 ${config.model}。评测注入仍用脚本。`,
      };
    }
    return {
      kind: "mock",
      model: "workspace",
      ready: true,
      hint: "未配置 OPENAI_API_KEY，工作台用规则 Agent。把 Key 写进 .env 后重启 npm run dev。",
    };
  } catch (error) {
    return {
      kind: "mock",
      model: "workspace",
      ready: false,
      hint: error instanceof Error ? error.message : String(error),
    };
  }
}
