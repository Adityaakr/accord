// `make dev`: the whole product on this machine. The local node with its stand-ins for OutLayer and the faucets
// (`make serve`), then the keeper, the demo agent and the app, all pointed at it. Every line is prefixed with
// its process; Ctrl-C stops everything.

import { spawn } from "node:child_process";

const env = { ...process.env, ACCORD_NETWORK: "sandbox", FORCE_COLOR: "0" };
const procs = [];

function start(name, cmd, args, opts = {}) {
  const p = spawn(cmd, args, { env, stdio: ["ignore", "pipe", "pipe"], ...opts });
  procs.push(p);
  const prefix = `${name.padEnd(7)}│ `;
  const pipe = (stream, onLine) => {
    let buf = "";
    stream.on("data", (d) => {
      buf += d.toString();
      for (let i = buf.indexOf("\n"); i >= 0; i = buf.indexOf("\n")) {
        const line = buf.slice(0, i);
        buf = buf.slice(i + 1);
        if (line.trim() && !/^\s*(INFO|WARN|DEBUG)\b|near_workspaces|neard/.test(line)) process.stdout.write(prefix + line + "\n");
        onLine?.(line);
      }
    });
  };
  pipe(p.stdout, opts.onLine);
  pipe(p.stderr);
  p.on("exit", (code) => {
    process.stdout.write(`${prefix}exited ${code}\n`);
    if (name === "node") shutdown(1);
  });
  return p;
}

function shutdown(code = 0) {
  for (const p of procs) if (p.exitCode === null) p.kill("SIGINT");
  setTimeout(() => process.exit(code), 500);
}
process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));

let started = false;
start("node", "cargo", ["run", "-q", "-p", "accord-sandbox", "--bin", "serve"], {
  onLine: (line) => {
    if (started || !line.startsWith("serving")) return;
    started = true;
    start("keeper", "pnpm", ["--silent", "--filter", "@accord/keeper", "start"]);
    start("agent", "pnpm", ["--silent", "--filter", "@accord/agent", "start"]);
    start("app", "pnpm", ["--silent", "--filter", "@accord/app", "dev"]);
    process.stdout.write("dev    │ app http://localhost:3100 · local node · make <target> NET=local in another terminal\n");
  },
});
