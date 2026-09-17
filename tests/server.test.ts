import assert from "node:assert/strict";
import test from "node:test";
import { createApp } from "../src/server/app.js";

const app = createApp({});

test("API：health 暴露三层", async () => {
  const res = await app.request("/api/health");
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.deepEqual(body.layers, ["web", "api", "agent"]);
});

test("API：未配置 Key 时 agent status 是规则 Agent", async () => {
  const res = await app.request("/api/agent/status");
  const body = await res.json();
  assert.equal(body.kind, "mock");
  assert.match(body.hint, /OPENAI_API_KEY/);
});

test("API：列出四种失败场景", async () => {
  const res = await app.request("/api/scenarios");
  const body = await res.json();
  assert.equal(body.scenarios.length, 4);
  assert.equal(body.scenarios[0].id, "premature");
});

test("API：对症恢复能把提前完成跑通", async () => {
  const res = await app.request("/api/runs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId: "premature", mode: "failure_aware" }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.finalPass, true);
  assert.equal(body.attempts[0].failureType, "premature_completion");
  assert.equal(body.attempts.at(-1).verifier, "pass");
});

test("API：工作台 Agent 能写满 5 个商品", async () => {
  const res = await app.request("/api/agent/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      description: "创建 result.json，里面必须有 5 个商品。",
      failureAware: true,
    }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.run.finalPass, true);
  assert.equal(body.modelKind, "workspace");
  assert.equal(body.modelId, "workspace");
  assert.equal(body.files[0].path, "result.json");
});

test("API：有 Key 时 status 报告 openai，但不发请求", async () => {
  const live = createApp({ OPENAI_API_KEY: "sk-test", OPENAI_MODEL: "gpt-4o-mini" });
  const res = await live.request("/api/agent/status");
  const body = await res.json();
  assert.equal(body.kind, "openai");
  assert.equal(body.model, "gpt-4o-mini");
  assert.equal(body.ready, true);
});

test("API：检索任务在失败感知下会换 hybrid 再通过", async () => {
  const res = await app.request("/api/agent/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      description: "检索 Transformer 相关资料，至少 3 条相关结果。",
      failureAware: true,
    }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.run.attempts[0].failureType, "retrieval_failure");
  assert.equal(body.run.finalPass, true);
  assert.equal(body.retrieval.strategy, "hybrid");
});

test("API：stream 把计算任务推完", async () => {
  const res = await app.request("/api/agent/run/stream", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      description: "计算 123 × 456。",
      failureAware: true,
    }),
  });
  assert.equal(res.status, 200);
  const text = await res.text();
  assert.match(text, /"type":"done"/);
  assert.match(text, /56088/);
});

test("API：未知场景返回 404", async () => {
  const res = await app.request("/api/runs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ scenarioId: "nope", mode: "baseline" }),
  });
  assert.equal(res.status, 404);
});
