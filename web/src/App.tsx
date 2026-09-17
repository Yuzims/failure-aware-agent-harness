import { useEffect, useState } from "react";
import { AgentView } from "./views/AgentView";
import { BenchmarkView } from "./views/BenchmarkView";
import { OverviewView } from "./views/OverviewView";
import { RetrievalView } from "./views/RetrievalView";
import { RunView } from "./views/RunView";
import { navigate, parseHash, type Route, type View } from "./lib/route";

const NAV: Array<{ view: View; label: string }> = [
  { view: "agent", label: "工作台" },
  { view: "overview", label: "评测" },
  { view: "run", label: "注入失败" },
  { view: "benchmark", label: "对照" },
  { view: "retrieval", label: "检索" },
];

export function App() {
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <small>Workspace Agent</small>
          <h1>有界 Workspace Agent</h1>
          <p className="muted">
            可运行的 Agent，不是 IDE 插件，也不是通用搜索引擎。工具集封闭：写文件 / 本地评测检索 /
            GitHub / 计算器。失败感知是内置层。
          </p>
        </div>
        <div className="layers">
          <span>React 工作台</span>
          <span>Node API</span>
          <span>Agent + Harness</span>
        </div>
      </header>

      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.view}
            className={route.view === item.view ? "active" : ""}
            onClick={() => navigate({ view: item.view })}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {route.view === "agent" ? <AgentView /> : null}
      {route.view === "overview" ? <OverviewView /> : null}
      {route.view === "run" ? <RunView scenarioId={route.scenarioId} /> : null}
      {route.view === "benchmark" ? <BenchmarkView /> : null}
      {route.view === "retrieval" ? <RetrievalView /> : null}
    </div>
  );
}
