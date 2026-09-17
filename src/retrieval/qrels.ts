export const TRANSFORMER_QUERY = "Transformer attention BERT";

export const TRANSFORMER_GOLD = new Set(["d1", "d2", "d3"]);

const QRELS: Record<string, Set<string>> = {
  transformer: TRANSFORMER_GOLD,
};

export function goldIdsFor(query: string): Set<string> {
  const tokens = query.toLowerCase();
  for (const [term, ids] of Object.entries(QRELS)) {
    if (tokens.includes(term)) {
      return ids;
    }
  }
  return new Set();
}

export function isGoldDoc(query: string, docId: string): boolean {
  return goldIdsFor(query).has(docId);
}
