export type RetrievalStrategy = "embedding" | "bm25" | "hybrid";

export interface RetrievedDoc {
  id: string;
  title: string;
  body?: string;
  score?: number;
  relevant: boolean;
}

export interface RetrievalSnapshot {
  strategy: RetrievalStrategy;
  hits: RetrievedDoc[];
}

// 第一版用内存当工作区，Verifier 检查的是这里，不是 Agent 嘴上说的话。
export class Workspace {
  private readonly files = new Map<string, string>();
  retrievalStrategy: RetrievalStrategy = "embedding";
  lastRetrieval?: RetrievalSnapshot;

  clearFiles(): void {
    this.files.clear();
    this.lastRetrieval = undefined;
  }

  listFiles(): Array<{ path: string; content: string }> {
    return [...this.files.entries()].map(([path, content]) => ({ path, content }));
  }

  writeFile(path: string, content: string): void {
    this.files.set(path, content);
  }

  exists(path: string): boolean {
    return this.files.has(path);
  }

  readFile(path: string): string | undefined {
    return this.files.get(path);
  }
}
