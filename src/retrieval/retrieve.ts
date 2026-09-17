import type { RetrievedDoc, RetrievalStrategy } from "../core/workspace.js";
import { bm25Search } from "./bm25.js";
import { isGoldDoc } from "./qrels.js";
import { tfidfSearch } from "./tfidf.js";
import type { ScoredDoc } from "./vector.js";

function toHits(query: string, ranked: ScoredDoc[]): RetrievedDoc[] {
  return ranked.map((item) => ({
    id: item.doc.id,
    title: item.doc.title,
    body: item.doc.body,
    score: Number(item.score.toFixed(4)),
    relevant: isGoldDoc(query, item.doc.id),
  }));
}

export function retrieve(
  strategy: RetrievalStrategy,
  query: string,
): RetrievedDoc[] {
  if (strategy === "embedding") {
    // TF-IDF + 语料质心：模拟 embedding 的 popularity / hubness 漂移
    return toHits(query, tfidfSearch(query, 3, { popularityPrior: 0.92 }));
  }

  if (strategy === "bm25") {
    return toHits(query, bm25Search(query, 3));
  }

  // hybrid：BM25 先召回，再用纯查询 TF-IDF 重排，避免质心把结果拉去热门噪声
  const pool = bm25Search(query, 8);
  const reranked = tfidfSearch(query, 8)
    .filter((item) => pool.some((hit) => hit.doc.id === item.doc.id))
    .slice(0, 3);

  return toHits(query, reranked.length > 0 ? reranked : pool.slice(0, 3));
}

export function precisionAtK(hits: RetrievedDoc[], k = 3): number {
  const sliced = hits.slice(0, k);
  if (sliced.length === 0) {
    return 0;
  }
  return sliced.filter((hit) => hit.relevant).length / sliced.length;
}
