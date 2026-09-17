import { spawn, type ChildProcess } from "node:child_process";

const children: ChildProcess[] = [];

function run(command: string, args: string[]) {
  const child = spawn(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  children.push(child);
  child.on("exit", (code) => {
    if (code && code !== 0) {
      shutdown();
      process.exit(code);
    }
  });
}

function shutdown() {
  for (const child of children) {
    child.kill();
  }
}

process.on("SIGINT", () => {
  shutdown();
  process.exit(0);
});

process.on("SIGTERM", () => {
  shutdown();
  process.exit(0);
});

run("npx", ["tsx", "watch", "src/server/listen.ts"]);
run("npm", ["--prefix", "web", "run", "dev"]);
