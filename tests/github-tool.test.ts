import assert from "node:assert/strict";
import test from "node:test";
import { Workspace } from "../src/core/workspace.js";
import { createGithubSearchTool } from "../src/tools/github.js";
import { classifyTask } from "../src/agent/task-intent.js";
import { parseChatCompletionStream } from "../src/agent/openai-compat-model.js";

test("GitHub 查询不会被当成本地论文检索", () => {
  assert.equal(
    classifyTask("查看github，告诉我最近一个月热门的agent项目"),
    "github",
  );
  assert.equal(classifyTask("检索 Transformer 相关资料，至少 3 条相关结果。"), "search");
});

test("github_search 把仓库写进工作区，不打真实 GitHub", async () => {
  const workspace = new Workspace();
  const tool = createGithubSearchTool(workspace, {
    fetchImpl: async (input) => {
      const url = String(input);
      assert.match(url, /search\/repositories/);
      assert.match(url, /created%3A%3E/);
      return new Response(
        JSON.stringify({
          total_count: 1,
          items: [
            {
              full_name: "OpenHands/OpenHands",
              html_url: "https://github.com/OpenHands/OpenHands",
              description: "Open-source coding agent",
              stargazers_count: 62000,
              language: "Python",
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2026-09-01T00:00:00Z",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });

  const output = (await tool.execute({
    query: "agent harness",
    sinceDays: 30,
  })) as { repos: Array<{ fullName: string }> };

  assert.equal(output.repos[0]?.fullName, "OpenHands/OpenHands");
  assert.equal(workspace.listFiles()[0]?.path, "github.json");
});

test("parseChatCompletionStream 拼 token 并回调", async () => {
  const chunks = [
    "data: {\"choices\":[{\"delta\":{\"content\":\"热\"}}]}\n\n",
    "data: {\"choices\":[{\"delta\":{\"content\":\"门\"}}]}\n\n",
    "data: [DONE]\n\n",
  ];
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const encoder = new TextEncoder();
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  const tokens: string[] = [];
  const assembled = (await parseChatCompletionStream(stream, (text) => tokens.push(text))) as {
    choices: Array<{ message: { content: string } }>;
  };
  assert.equal(assembled.choices[0]?.message.content, "热门");
  assert.deepEqual(tokens, ["热", "门"]);
});
