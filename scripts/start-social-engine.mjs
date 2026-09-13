import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = path.join(root, "dashboard"),
  production = process.argv.includes("--production");
const worker = spawn(
  process.execPath,
  [path.join(dashboard, "node_modules/tsx/dist/cli.mjs"), "engine/worker.ts"],
  {
    cwd: dashboard,
    stdio: "inherit",
    env: { ...process.env, SOCIAL_ENGINE_ROOT: root },
  },
);
const web = spawn(
  process.execPath,
  [
    path.join(dashboard, "node_modules/next/dist/bin/next"),
    production ? "start" : "dev",
    "-H",
    "127.0.0.1",
    "-p",
    process.env.SOCIAL_ENGINE_PORT || "5175",
  ],
  {
    cwd: dashboard,
    stdio: "inherit",
    env: { ...process.env, SOCIAL_ENGINE_ROOT: root },
  },
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  worker.kill("SIGTERM");
  web.kill("SIGTERM");
  process.exitCode = code;
}
worker.on("exit", (code) => stop(code || 0));
web.on("exit", (code) => stop(code || 0));
worker.on("error", () => stop(1));
web.on("error", () => stop(1));
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
