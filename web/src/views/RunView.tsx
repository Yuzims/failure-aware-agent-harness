import { useEffect, useMemo, useState } from "react";
import { fetchScenarios, runScenario } from "../api/client";
import { navigate } from "../lib/route";
import type { BenchmarkMode, RunDTO, ScenarioInfo } from "@dto";

const MODES: Array<{ id: BenchmarkMode; label: string }> = [
  { id: "baseline", label: "信 Agent" },
  { id: "generic_retry", label: "盲重试" },
  { id: "failure_aware", label: "对症恢复" },
];

export function RunView({ scenarioId }: { scenarioId?: string }) {
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>([]);
  const [mode, setMode] = useState<BenchmarkMode>("failure_aware");
  const [run, setRun] = useState<RunDTO>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const selected = useMemo(
    () => scenarios.find((item) => item.id === scenarioId) ?? scenarios[0],
    [scenarios, scenarioId],
  );

  useEffect(() => {
    fetchScenarios()
      .then((payload) => setScenarios(payload.scenarios))
      .catch((err: Error) => setError(err.message));
  }, []);

  async function onRun() {
    if (!selected) {
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      setRun(await runScenario(selected.id, mode));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid cols-2">
      <section className="card">
        <h2>跑一条失败注入</h2>
        <p className="muted">API 调 Harness。前端只渲染 Verifier / Analyzer / Recovery。</p>
        <div className="row" style={{ margin: "12px 0" }}>
          {scenarios.map((item) => (
            <button
              key={item.id}
              className={item.id === selected?.id ? "chip active" : "chip"}
              onClick={() => navigate({ view: "run", scenarioId: item.id })}
            >
              {item.title}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginBottom: 12 }}>
          {MODES.map((item) => (
            <button
              key={item.id}
              className={item.id === mode ? "chip active" : "chip"}
              onClick={() => setMode(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="muted">{selected?.description}</p>
        <button className="primary" onClick={onRun} disabled={!selected || loading}>
          {loading ? "Harness 运行中…" : "运行"}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="card">
        {!run ? (
          <p className="muted">选场景和策略，点运行。对比「信 Agent」和「对症恢复」最能讲 False Completion。</p>
        ) : (
          <RunResult run={run} />
        )}
      </section>
    </div>
  );
}

function RunResult({ run }: { run: RunDTO }) {
  return (
    <div>
      <div className="row">
        <h2 style={{ marginRight: "auto" }}>{run.title}</h2>
        <span className={`status ${run.finalPass ? "pass" : "fail"}`}>
          {run.finalPass ? "Verifier PASS" : "Verifier FAIL"}
        </span>
      </div>
      <p className="muted mono">
        modelCalls={run.modelCalls} toolCalls={run.toolCalls} recovery={run.recoveryCount}{" "}
        {run.latencyMs.toFixed(1)}ms
      </p>
      {run.attempts.map((attempt) => (
        <article key={attempt.attempt} className="attempt" style={{ marginTop: 12 }}>
          <h3>
            第 {attempt.attempt} 次 · Verifier {attempt.verifier}
          </h3>
          <p>Agent：{attempt.agentOutput}</p>
          {attempt.checks.map((check) => (
            <div key={check.name} className={`check ${check.passed ? "ok" : "bad"}`}>
              {check.passed ? "PASS" : "FAIL"} {check.name} · {check.reason}
            </div>
          ))}
          {attempt.failureType ? (
            <p>
              Analyzer：{attempt.failureType}
              {attempt.failureRootCause ? ` (${attempt.failureRootCause})` : ""}
            </p>
          ) : null}
          {attempt.recoveryAction ? (
            <p>
              Recovery：{attempt.recoveryAction} — {attempt.recoveryReason}
            </p>
          ) : null}
        </article>
      ))}
      <details style={{ marginTop: 12 }}>
        <summary>事件轨迹</summary>
        <ol className="timeline">
          {run.events.map((event, index) => (
            <li key={`${event.type}-${index}`}>
              <span className="mono">
                s{event.step} {event.type}
              </span>
              <span>{event.summary}</span>
            </li>
          ))}
        </ol>
      </details>
    </div>
  );
}
