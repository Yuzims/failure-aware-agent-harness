import assert from "node:assert/strict";
import test from "node:test";
import { assertBenchmark, runBenchmark } from "../src/eval/benchmark.js";

test("Benchmark：对症恢复成功率更高，循环失败上模型调用更少", async () => {
  const results = await runBenchmark();
  assertBenchmark(results);

  const aware = results.find((row) => row.mode === "failure_aware");
  const generic = results.find((row) => row.mode === "generic_retry");
  const baseline = results.find((row) => row.mode === "baseline");
  assert.ok(aware && generic && baseline);

  assert.equal(aware.successRate, 0.75);
  assert.equal(baseline.successRate, 0);
  assert.ok(generic.successRate < aware.successRate);

  const loopAware = aware.cases.find((item) => item.id === "loop");
  const loopGeneric = generic.cases.find((item) => item.id === "loop");
  assert.ok(loopAware && loopGeneric);
  assert.ok(loopAware.attempts < loopGeneric.attempts);
  assert.ok(loopAware.modelCalls < loopGeneric.modelCalls);
  assert.ok(aware.avgModelCalls > 0);
  assert.ok(aware.avgLatencyMs >= 0);
});
