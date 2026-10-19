import { spawn, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dashboard = path.join(root, "dashboard"),
  production = process.argv.includes("--production");
// `next dev` shares .next and drops BUILD_ID, which made `next start` crash-loop under launchd
// (2026-10-14..19). Rebuild once instead of failing on every restart.
if (production && !existsSync(path.join(dashboard, ".next", "BUILD_ID"))) {
  const build = spawnSync(
    process.execPath,
    [path.join(dashboard, "node_modules/next/dist/bin/next"), "build"],
    { cwd: dashboard, stdio: "inherit", env: { ...process.env, SOCIAL_ENGINE_ROOT: root } },
  );
  if (build.status !== 0) process.exit(build.status ?? 1);
}
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
