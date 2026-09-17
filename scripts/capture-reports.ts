import { writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

function capture(script: string, outFile: string) {
  const result = spawnSync(process.execPath, ["--import", "tsx", script], {
    encoding: "utf8",
    cwd: resolve("."),
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `failed: ${script}`);
  }
  writeFileSync(outFile, result.stdout, "utf8");
}

capture("examples/benchmark.ts", "reports/benchmark.txt");
capture("examples/ablation.ts", "reports/ablation.txt");
console.log("wrote reports/benchmark.txt and reports/ablation.txt");
