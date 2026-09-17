import type { RetrievedDoc, RetrievalStrategy } from "../core/workspace.js";
import { TRANSFORMER_QUERY } from "./qrels.js";
import { precisionAtK, retrieve } from "./retrieve.js";

export interface AblationRow {
  strategy: RetrievalStrategy;
  query: string;
  hits: RetrievedDoc[];
  precisionAt3: number;
  relevantCount: number;
}

export function runRetrievalAblation(
  query = TRANSFORMER_QUERY,
): AblationRow[] {
  const strategies: RetrievalStrategy[] = ["embedding", "bm25", "hybrid"];
  return strategies.map((strategy) => {
    const hits = retrieve(strategy, query);
    return {
      strategy,
      query,
      hits,
      precisionAt3: precisionAtK(hits, 3),
      relevantCount: hits.filter((hit) => hit.relevant).length,
    };
  });
}
