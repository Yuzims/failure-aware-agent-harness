import { useEffect, useState } from "react";
import { fetchBenchmark } from "../api/client";
import type { ModeScoreDTO } from "@dto";

const LABELS: Record<string, string> = {
  baseline: "信 Agent",
  generic_retry: "盲重试",
  failure_aware: "对症恢复",
};

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function BenchmarkView() {
  const [modes, setModes] = useState<ModeScoreDTO[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetchBenchmark()
      .then((payload) => setModes(payload.modes))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="grid">
      <section className="card">
        <h2>同一批注入失败，三种策略对照</h2>
        <p className="muted">成功率看 Verifier。成本用模型调用次数近似 Token。</p>
        {error ? <p className="error">{error}</p> : null}
        <div className="grid cols-3" style={{ marginTop: 16 }}>
          {modes.map((row) => (
            <article key={row.mode} className="card">
              <h3>{LABELS[row.mode] ?? row.mode}</h3>
              <Metric label="成功率" value={row.successRate} />
              <Metric label="误完成率" value={row.falseCompletionRate} fail />
              <p className="muted">平均调用 {row.avgModelCalls.toFixed(2)}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="card">
        <h3>分任务</h3>
        {modes[0]?.cases.map((item) => (
          <div key={item.id} className="hit">
            <strong>{item.title}</strong>
            <span className="mono">
              {modes
                .map((row) => {
                  const found = row.cases.find((entry) => entry.id === item.id);
                  return `${LABELS[row.mode]}:${found?.verifierPass ? "PASS" : "FAIL"}`;
                })
                .join("  ")}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  fail = false,
}: {
  label: string;
  value: number;
  fail?: boolean;
}) {
  return (
    <div style={{ margin: "10px 0" }}>
      <div className="kicker">
        {label} {pct(value)}
      </div>
      <div className={`bar ${fail ? "fail" : "pass"}`}>
        <span style={{ width: `${Math.max(4, value * 100)}%` }} />
      </div>
    </div>
  );
}
