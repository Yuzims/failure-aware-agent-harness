import type { Tool } from "./tool.js";
import type { Workspace } from "../core/workspace.js";

export function createWriteJsonTool(workspace: Workspace): Tool {
  return {
    name: "write_json",
    description: "Write a JSON file into the workspace.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Workspace file path, e.g. result.json" },
        data: { description: "JSON value to write. For product lists, an array of objects." },
      },
      required: ["path", "data"],
    },

    async execute(args) {
      const path = args.path;
      const data = args.data;

      if (typeof path !== "string" || path.trim() === "") {
        throw new Error("path must be a non-empty string");
      }

      if (data === undefined) {
        throw new Error("data is required");
      }

      workspace.writeFile(path, JSON.stringify(data, null, 2));

      return {
        path,
        itemCount: Array.isArray(data) ? data.length : 1,
      };
    },
  };
}

export function createFlakyWriteJsonTool(
  workspace: Workspace,
  failTimes = 1,
): Tool {
  let failed = 0;
  const inner = createWriteJsonTool(workspace);

  return {
    name: inner.name,
    description: inner.description,
    async execute(args) {
      if (failed < failTimes) {
        failed += 1;
        throw new Error("temporary write failure");
      }

      return inner.execute(args);
    },
  };
}
