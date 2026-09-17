import { runRetrievalAblation } from "../src/retrieval/ablation.js";
import { TRANSFORMER_QUERY } from "../src/retrieval/qrels.js";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

const rows = runRetrievalAblation();

console.log("\n======== Retrieval Ablation ========\n");
console.log(`查询：${TRANSFORMER_QUERY}`);
console.log("标注：d1 Attention / d2 架构综述 / d3 BERT\n");
console.log(
  "策略".padEnd(12),
  "P@3".padEnd(8),
  "相关条数".padEnd(10),
  "Top-3",
);
console.log("-".repeat(72));

for (const row of rows) {
  console.log(
    row.strategy.padEnd(12),
    pct(row.precisionAt3).padEnd(8),
    String(row.relevantCount).padEnd(10),
    row.hits.map((hit) => `${hit.id}${hit.relevant ? "*" : ""}`).join(", "),
  );
}

const embedding = rows.find((row) => row.strategy === "embedding");
const bm25 = rows.find((row) => row.strategy === "bm25");
const hybrid = rows.find((row) => row.strategy === "hybrid");

if (!embedding || !bm25 || !hybrid) {
  throw new Error("消融结果不完整");
}

if (embedding.precisionAt3 !== 0) {
  throw new Error("embedding + 质心先验应漂到热门噪声，P@3 应为 0");
}

if (bm25.relevantCount < 3) {
  throw new Error("BM25 应召回 3 条 gold");
}

if (hybrid.relevantCount < 3) {
  throw new Error("hybrid 应在 BM25 召回后再排到 3 条 gold");
}

console.log("\nembedding：查询 TF-IDF 混入语料质心，模拟 hubness，Top-3 是热门噪声。");
console.log("BM25：词面匹配，gold 论文排在 transformer 同形词噪声前面。");
console.log("hybrid：BM25 先召回，再用纯查询 TF-IDF 重排。");
