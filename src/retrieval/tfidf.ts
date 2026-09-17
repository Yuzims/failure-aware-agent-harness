import { INDEX, cosine, meanDocVector, mixVectors, queryTf, tfidfVector, type ScoredDoc } from "./vector.js";

const CENTROID = meanDocVector();

export function tfidfSearch(
  query: string,
  limit = 3,
  options: { popularityPrior?: number } = {},
): ScoredDoc[] {
  const queryVec = tfidfVector(queryTf(query));
  const prior = options.popularityPrior ?? 0;
  const used = prior > 0 ? mixVectors(queryVec, CENTROID, 1 - prior) : queryVec;

  return INDEX.indexed
    .map((item) => ({
      doc: item.doc,
      score: cosine(used, tfidfVector(item.tf)),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
