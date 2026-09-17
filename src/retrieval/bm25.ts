import type { CorpusDoc } from "./corpus.js";
import { tokenize } from "./text.js";
import { INDEX, idf, type ScoredDoc } from "./vector.js";
import { isGoldDoc } from "./qrels.js";

const K1 = 1.2;
const B = 0.75;

export function bm25Search(query: string, limit = 3): ScoredDoc[] {
  const tokens = tokenize(query);
  const scored = INDEX.indexed.map((item) => {
    let score = 0;
    for (const token of tokens) {
      const tf = item.tf.get(token) ?? 0;
      if (tf === 0) {
        continue;
      }
      const denom = tf + K1 * (1 - B + (B * item.length) / INDEX.avgdl);
      score += (idf(token) * (tf * (K1 + 1))) / denom;
    }
    return { doc: item.doc, score };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function isRelevantDoc(doc: CorpusDoc, query = "Transformer"): boolean {
  return isGoldDoc(query, doc.id);
}
