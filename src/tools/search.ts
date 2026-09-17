import type { Tool } from "./tool.js";
import type { Workspace } from "../core/workspace.js";
import { retrieve } from "../retrieval/retrieve.js";

export function createSearchTool(workspace: Workspace): Tool {
  return {
    name: "search",
    description:
      "Search the LOCAL evaluation corpus only (Transformer / BERT papers plus distractors like restaurants and weather). Never use this for GitHub, news, jobs, or the open web.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Search query" },
      },
      required: ["query"],
    },

    async execute(args) {
      const query = args.query;
      if (typeof query !== "string" || query.trim() === "") {
        throw new Error("query must be a non-empty string");
      }

      const hits = retrieve(workspace.retrievalStrategy, query);
      workspace.lastRetrieval = {
        strategy: workspace.retrievalStrategy,
        hits,
      };

      return {
        strategy: workspace.retrievalStrategy,
        relevantCount: hits.filter((hit) => hit.relevant).length,
        hits,
      };
    },
  };
}
