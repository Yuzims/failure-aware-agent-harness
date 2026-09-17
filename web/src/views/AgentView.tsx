import { useEffect, useState, type FormEvent } from "react";
import { fetchAgentExamples, fetchAgentStatus, runAgentStream } from "../api/client";
import type { AgentExampleDTO, AgentSessionDTO, AgentStatusDTO } from "@dto";

export function AgentView() {
  const [status, setStatus] = useState<AgentStatusDTO>();
  const [examples, setExamples] = useState<AgentExampleDTO[]>([]);
  const [description, setDescription] = useState(
    "在 GitHub 上查找最近一个月和 Agent / harness 相关的热门仓库，列出项目名、星标和一句话用途。不要用本地论文检索。",
  );
  const [failureAware, setFailureAware] = useState(true);
  const [session, setSession] = useState<AgentSessionDTO>();
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const [delta, setDelta] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    Promise.all([fetchAgentExamples(), fetchAgentStatus()])
      .then(([examplePayload, statusPayload]) => {
        setExamples(examplePayload.examples);
        setStatus(statusPayload);
      })
      .catch((err: Error) => setError(err.message));
  }, []);

  async function onSubmit(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError(undefined);
    setSession(undefined);
    setLiveLog([]);
    setDelta("");
    try {
      const result = await runAgentStream(description, failureAware, (streamEvent) => {
        if (streamEvent.type === "log" && streamEvent.message) {
          setLiveLog((items) => [...items, streamEvent.message ?? ""]);
        }
        if (streamEvent.type === "tool_call") {
          setLiveLog((items) => [
            ...items,
            `调用 ${streamEvent.name} ${JSON.stringify(streamEvent.arguments ?? {})}`,
          ]);
        }
        if (streamEvent.type === "tool_result") {
          setLiveLog((items) => [
            ...items,
            streamEvent.success === false
              ? `工具失败 ${streamEvent.preview ?? ""}`
              : `工具返回 ${streamEvent.preview ?? ""}`,
          ]);
        }
        if (streamEvent.type === "delta" && streamEvent.text) {
          setDelta((text) => text + streamEvent.text);
        }
        if (streamEvent.type === "error" && streamEvent.message) {
          setError(streamEvent.message);
        }
      });
      setSession(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const latest = session?.run.attempts.at(-1);
  const streamingOutput = delta || latest?.agentOutput;

  return (
    <div className="grid">
      <section className="card">
        <h2>给 Agent 一个任务</h2>
        <p className="muted">
          有界工具：写文件、本地评测检索、GitHub、计算器。不是浏览器插件，也不能爬牛客。
          右侧 Verifier 不信终答。
        </p>
        <p className="muted" style={{ marginTop: 8 }}>
          {status
            ? status.kind === "openai"
              ? `当前模型：${status.model}`
              : status.hint
            : "正在读取模型配置…"}
        </p>
        <form onSubmit={onSubmit}>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={3}
            placeholder="例如：在 GitHub 上找最近一个月的 Agent harness。"
          />
          <div className="row" style={{ margin: "12px 0" }}>
            {examples.map((item) => (
              <button
                key={item.label}
                type="button"
                className="chip"
                onClick={() => setDescription(item.description)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="row muted">
            <input
              type="checkbox"
              checked={failureAware}
              onChange={(event) => setFailureAware(event.target.checked)}
            />
            失败感知（Verifier + 对症恢复）
          </label>
          <div style={{ marginTop: 12 }}>
            <button className="primary" type="submit" disabled={loading || !description.trim()}>
              {loading ? "Agent 运行中…" : "交给 Agent"}
            </button>
          </div>
        </form>
        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="agent-grid">
        <article className="card">
          <h3>对话 / 轨迹</h3>
          {!loading && !session && liveLog.length === 0 ? (
            <p className="muted">
              GitHub 任务会走 github_search。Transformer 那条仍走本地语料，用来演示检索失败恢复。
            </p>
          ) : null}
          {liveLog.map((line, index) => (
            <p key={`${index}-${line.slice(0, 24)}`} className="muted live-line">
              {line}
            </p>
          ))}
          {streamingOutput ? (
            <div className="attempt" style={{ marginTop: 12 }}>
              <div className="kicker">
                {session
                  ? `第 ${latest?.attempt ?? 1} 轮 · ${session.modelKind === "openai" ? session.modelId : "规则 Agent"}`
                  : "流式输出"}
              </div>
              <p className="delta">{streamingOutput}</p>
              {latest?.recoveryAction ? (
                <p className="muted">
                  恢复：{latest.recoveryAction} — {latest.recoveryReason}
                </p>
              ) : null}
            </div>
          ) : null}
        </article>

        <article className="card">
          <h3>工作区</h3>
          {!session?.files.length && !session?.retrieval ? (
            <p className="muted">GitHub 命中会写成 github.json；本地检索命中出现在下面。</p>
          ) : null}
          {session?.files.map((file) => (
            <div key={file.path}>
              <div className="kicker">{file.path}</div>
              <pre className="mono">{file.content}</pre>
            </div>
          ))}
          {session?.retrieval ? (
            <div>
              <div className="kicker">本地检索 {session.retrieval.strategy}</div>
              {session.retrieval.hits.map((hit) => (
                <div key={hit.id} className={hit.relevant ? "hit gold" : "hit"}>
                  <span>
                    {hit.id} {hit.title}
                  </span>
                  <span className="mono">{hit.relevant ? "gold" : "noise"}</span>
                </div>
              ))}
            </div>
          ) : null}
        </article>

        <article className="card highlight">
          <p className="kicker">亮点 · Failure-Aware</p>
          <h3>完成与否不看嘴</h3>
          {!latest ? (
            <p className="muted">
              写文件 / 本地检索会做产物检查。GitHub 任务检查工具是否真正返回了仓库。
            </p>
          ) : (
            <>
              <p className={`status ${session?.run.finalPass ? "pass" : "fail"}`}>
                {session?.run.finalPass ? "Verifier PASS" : "Verifier FAIL"}
                {session?.run.recoveryCount ? ` · 恢复 ${session.run.recoveryCount} 次` : ""}
              </p>
              {latest.checks.map((check) => (
                <div key={check.name} className={`check ${check.passed ? "ok" : "bad"}`}>
                  {check.passed ? "PASS" : "FAIL"} {check.name} · {check.reason}
                </div>
              ))}
              {latest.failureType ? (
                <p className="muted">
                  {latest.failureType}
                  {latest.failureRootCause ? ` / ${latest.failureRootCause}` : ""}
                </p>
              ) : null}
            </>
          )}
        </article>
      </section>
    </div>
  );
}
