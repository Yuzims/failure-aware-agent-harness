import { useEffect, useState } from "react";
import { fetchBenchmark } from "../api/client";
import { navigate } from "../lib/route";
import type { ModeScoreDTO } from "@dto";

const FAILURES = [
  {
    id: "premature",
    title: "False Completion",
    body: "模型输出「已经完成」，文件里却只有 3 条。Verifier 看产物，不看自报。",
  },
  {
    id: "tool",
    title: "工具失败",
    body: "写文件第一次抛错。这不是提前完成，是 tool_failure，该重试工具。",
  },
  {
    id: "retrieval",
    title: "检索 hubness",
    body: "embedding 漂到热门噪声。召回不足和证据没用上要分开查。",
  },
  {
    id: "loop",
    title: "死循环",
    body: "同一工具打转。对症策略是 stop，盲重试只会把调用从 4 次烧到 12 次。",
  },
];

function pct(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function OverviewView() {
  const [aware, setAware] = useState<ModeScoreDTO>();
  const [generic, setGeneric] = useState<ModeScoreDTO>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetchBenchmark()
      .then((payload) => {
        setAware(payload.modes.find((row) => row.mode === "failure_aware"));
        setGeneric(payload.modes.find((row) => row.mode === "generic_retry"));
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="grid">
      <section className="card">
        <p className="kicker">评测实验室</p>
        <h2>同一套 Harness，对照三种恢复策略</h2>
        <p className="muted">
          工作台是产品。这里用注入失败证明：为什么要内置 Verifier，而不是盲重试。
        </p>
      </section>

      <section className="grid cols-3">
        <article className="card">
          <div className="kicker">对症恢复成功率</div>
          <div className="stat pass">{aware ? pct(aware.successRate) : "—"}</div>
          <p className="muted">盲重试 {generic ? pct(generic.successRate) : "—"}</p>
        </article>
        <article className="card">
          <div className="kicker">误完成率</div>
          <div className="stat pass">{aware ? pct(aware.falseCompletionRate) : "—"}</div>
          <p className="muted">盲重试 {generic ? pct(generic.falseCompletionRate) : "—"}</p>
        </article>
        <article className="card">
          <div className="kicker">平均模型调用</div>
          <div className="stat">{aware ? aware.avgModelCalls.toFixed(2) : "—"}</div>
          <p className="muted">盲重试 {generic ? generic.avgModelCalls.toFixed(2) : "—"}</p>
        </article>
      </section>

      {error ? <p className="error">API 未连上：{error}。先开后端 npm run api。</p> : null}

      <section className="grid cols-4">
        {FAILURES.map((item) => (
          <article
            key={item.id}
            className="card clickable"
            onClick={() => navigate({ view: "run", scenarioId: item.id })}
          >
            <h3>{item.title}</h3>
            <p className="muted">{item.body}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
