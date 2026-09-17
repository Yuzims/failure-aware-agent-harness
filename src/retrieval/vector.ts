import { CORPUS, type CorpusDoc } from "./corpus.js";
import { tokenize } from "./text.js";

export interface ScoredDoc {
  doc: CorpusDoc;
  score: number;
}

interface IndexedDoc {
  doc: CorpusDoc;
  tf: Map<string, number>;
  length: number;
}

function buildIndex(docs: CorpusDoc[]) {
  const indexed: IndexedDoc[] = docs.map((doc) => {
    const tokens = tokenize(`${doc.title} ${doc.body}`);
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) ?? 0) + 1);
    }
    return { doc, tf, length: tokens.length };
  });

  const df = new Map<string, number>();
  for (const item of indexed) {
    for (const token of item.tf.keys()) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }

  const avgdl =
    indexed.reduce((sum, item) => sum + item.length, 0) / Math.max(indexed.length, 1);

  return { indexed, df, avgdl, n: indexed.length };
}

export const INDEX = buildIndex(CORPUS);

export function idf(token: string): number {
  const df = INDEX.df.get(token) ?? 0;
  return Math.log((INDEX.n - df + 0.5) / (df + 0.5) + 1);
}

export function tfidfVector(tf: Map<string, number>): Map<string, number> {
  const vec = new Map<string, number>();
  for (const [token, freq] of tf) {
    vec.set(token, (freq / Math.max(tf.size, 1)) * idf(token));
  }
  return vec;
}

export function queryTf(query: string): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokenize(query)) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  return tf;
}

export function cosine(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const value of a.values()) {
    normA += value * value;
  }
  for (const value of b.values()) {
    normB += value * value;
  }
  const keys = new Set([...a.keys(), ...b.keys()]);
  for (const key of keys) {
    dot += (a.get(key) ?? 0) * (b.get(key) ?? 0);
  }
  if (normA === 0 || normB === 0) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function meanDocVector(): Map<string, number> {
  const mean = new Map<string, number>();
  for (const item of INDEX.indexed) {
    const vec = tfidfVector(item.tf);
    for (const [token, value] of vec) {
      mean.set(token, (mean.get(token) ?? 0) + value / INDEX.n);
    }
  }
  return mean;
}

export function mixVectors(
  query: Map<string, number>,
  prior: Map<string, number>,
  queryWeight: number,
): Map<string, number> {
  const mixed = new Map<string, number>();
  const keys = new Set([...query.keys(), ...prior.keys()]);
  for (const key of keys) {
    mixed.set(
      key,
      queryWeight * (query.get(key) ?? 0) + (1 - queryWeight) * (prior.get(key) ?? 0),
    );
  }
  return mixed;
}
