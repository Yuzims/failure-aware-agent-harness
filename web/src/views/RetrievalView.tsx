import { useEffect, useState } from "react";
import { fetchRetrieval } from "../api/client";
import type { AblationRowDTO } from "@dto";

const COPY: Record<string, string> = {
  embedding: "查询 TF-IDF 混语料质心，模拟 hubness，漂到热门噪声。",
  bm25: "词面 BM25（k1=1.2, b=0.75），gold 论文排在同形词前面。",
  hybrid: "BM25 先召回 8 条，再用纯查询 TF-IDF 重排。",
};

export function RetrievalView() {
  const [rows, setRows] = useState<AblationRowDTO[]>([]);
  const [error, setError] = useState<string>();

  useEffect(() => {
    fetchRetrieval()
      .then((payload) => setRows(payload.rows))
      .catch((err: Error) => setError(err.message));
  }, []);

  return (
    <div className="grid">
      <section className="card">
        <h2>检索消融</h2>
        <p className="muted">{rows[0]?.query ?? "Transformer attention BERT"} · gold = d1 / d2 / d3</p>
        {error ? <p className="error">{error}</p> : null}
      </section>
      <section className="grid cols-3">
        {rows.map((row) => (
          <article key={row.strategy} className="card">
            <h3>{row.strategy}</h3>
            <div className={`stat ${row.precisionAt3 === 1 ? "pass" : "fail"}`}>
              P@3 {Math.round(row.precisionAt3 * 100)}%
            </div>
            <p className="muted">{COPY[row.strategy] ?? ""}</p>
            {row.hits.map((hit) => (
              <div key={hit.id} className={hit.relevant ? "hit gold" : "hit"}>
                <span>
                  {hit.id} {hit.title}
                </span>
                <span className="mono">{hit.relevant ? "gold" : "noise"}</span>
              </div>
            ))}
          </article>
        ))}
      </section>
    </div>
  );
}
