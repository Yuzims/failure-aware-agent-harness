import assert from "node:assert/strict";
import test from "node:test";
import { bm25Search } from "../src/retrieval/bm25.js";
import { runRetrievalAblation } from "../src/retrieval/ablation.js";
import { isGoldDoc, TRANSFORMER_QUERY } from "../src/retrieval/qrels.js";
import { retrieve } from "../src/retrieval/retrieve.js";
import { Workspace } from "../src/core/workspace.js";
import { createSearchTool } from "../src/tools/search.js";

test("BM25：标注查询把 gold 论文排在同形词噪声前面", () => {
  const hits = bm25Search(TRANSFORMER_QUERY, 8);
  assert.ok(hits.length >= 3);
  assert.equal(isGoldDoc(TRANSFORMER_QUERY, hits[0]!.doc.id), true);
  assert.ok(
    hits.some((item) => item.doc.title.includes("Attention")),
    "应召回 Attention Is All You Need",
  );
});

test("BM25：天气查询打到噪声文档，不碰到 gold", () => {
  const hits = bm25Search("天气 美食 股票", 6);
  assert.equal(hits.some((item) => item.doc.title.includes("天气")), true);
  assert.equal(
    hits.filter((item) => isGoldDoc(TRANSFORMER_QUERY, item.doc.id)).length,
    0,
  );
});

test("retrieve：embedding + 质心先验漂到热门噪声，相关条数为 0", () => {
  const hits = retrieve("embedding", TRANSFORMER_QUERY);
  assert.equal(hits.every((item) => item.relevant === false), true);
});

test("retrieve：BM25 和 hybrid 都能拿到 3 条 gold", () => {
  const bm25 = retrieve("bm25", TRANSFORMER_QUERY);
  const hybrid = retrieve("hybrid", TRANSFORMER_QUERY);
  assert.ok(bm25.filter((item) => item.relevant).length >= 3);
  assert.ok(hybrid.filter((item) => item.relevant).length >= 3);
});

test("消融：embedding P@3 = 0，BM25 / hybrid P@3 = 1", () => {
  const rows = runRetrievalAblation();
  const embedding = rows.find((row) => row.strategy === "embedding");
  const bm25 = rows.find((row) => row.strategy === "bm25");
  const hybrid = rows.find((row) => row.strategy === "hybrid");
  assert.equal(embedding?.precisionAt3, 0);
  assert.equal(bm25?.precisionAt3, 1);
  assert.equal(hybrid?.precisionAt3, 1);
});

test("search tool 会把策略、id 和命中写进 workspace", async () => {
  const workspace = new Workspace();
  workspace.retrievalStrategy = "hybrid";
  const tool = createSearchTool(workspace);
  const output = await tool.execute({ query: TRANSFORMER_QUERY });
  assert.equal(workspace.lastRetrieval?.strategy, "hybrid");
  assert.ok((output as { relevantCount: number }).relevantCount >= 3);
  assert.ok(workspace.lastRetrieval?.hits.every((hit) => typeof hit.id === "string"));
});
