import { assertBenchmark, runBenchmark } from "../src/eval/benchmark.js";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function label(mode: string): string {
  if (mode === "baseline") {
    return "Baseline 信 Agent";
  }
  if (mode === "generic_retry") {
    return "盲重试";
  }
  return "对症恢复";
}

const results = await runBenchmark();

console.log("\n======== Failure Injection Benchmark ========\n");
console.log("对比的是同一批注入失败任务：提前完成 / 工具失败 / 检索跑偏 / 循环打转");
console.log("成功与否一律看 Verifier，不看 Agent 自己怎么说。");
console.log("成本用模型调用次数近似 Token：Mock Model 每次 decide() 记一次。\n");

console.log(
  "模式".padEnd(16),
  "成功率".padEnd(8),
  "误完成率".padEnd(8),
  "恢复率".padEnd(8),
  "平均尝试".padEnd(8),
  "平均模型调用".padEnd(12),
  "平均耗时ms",
);
console.log("-".repeat(80));

for (const row of results) {
  console.log(
    label(row.mode).padEnd(16),
    pct(row.successRate).padEnd(8),
    pct(row.falseCompletionRate).padEnd(8),
    pct(row.recoveryRate).padEnd(8),
    row.avgAttempts.toFixed(2).padEnd(8),
    row.avgModelCalls.toFixed(2).padEnd(12),
    row.avgLatencyMs.toFixed(1),
  );
}

console.log("\n分任务明细：");
for (const row of results) {
  console.log(`\n[${label(row.mode)}]`);
  for (const item of row.cases) {
    console.log(
      `  ${item.id.padEnd(12)} verifier=${item.verifierPass ? "PASS" : "FAIL"}  attempts=${item.attempts}  modelCalls=${item.modelCalls}  falseCompletion=${item.falseCompletion}  recovered=${item.recovered}  first=${item.firstFailure ?? "-"}`,
    );
  }
}

assertBenchmark(results);

console.log("\n结论：对症恢复比“信 Agent”和“瞎重试”更能把该过的任务救回来，又不会在循环失败上死磕，模型调用成本更低。");
