import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const label = "com.hackobi.social-engine",
  target = `gui/${process.getuid()}`;
const destination = path.join(
  os.homedir(),
  "Library/LaunchAgents",
  `${label}.plist`,
);
const log = path.join(root, "data/social-engine/service.log");
const xml = (s) =>
  s.replace(
    /[<>&"']/g,
    (ch) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[ch],
  );
const plist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>Label</key><string>${label}</string>
<key>ProgramArguments</key><array><string>${xml(process.execPath)}</string><string>${xml(path.join(root, "scripts/start-social-engine.mjs"))}</string><string>--production</string></array>
<key>WorkingDirectory</key><string>${xml(root)}</string>
<key>EnvironmentVariables</key><dict><key>PATH</key><string>${xml(path.dirname(process.execPath))}:/opt/homebrew/bin:/usr/bin:/bin</string><key>HIGGSFIELD_NO_UPDATE_CHECK</key><string>1</string></dict>
<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>30</integer>
<key>StandardOutPath</key><string>${xml(log)}</string><key>StandardErrorPath</key><string>${xml(log)}</string>
</dict></plist>`;
const mode = process.argv[2] || "preview";
if (mode === "preview") {
  console.log(plist);
} else if (mode === "stop") {
  execFileSync("/bin/launchctl", ["bootout", `${target}/${label}`], {
    stdio: "inherit",
  });
  if (fs.existsSync(destination)) fs.unlinkSync(destination);
  console.log("Social Engine stopped. Background startup disabled.");
} else if (mode === "install") {
  if (!fs.existsSync(path.join(root, "dashboard/.next/BUILD_ID")))
    throw new Error("Run npm run app:build first");
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.mkdirSync(path.dirname(log), { recursive: true, mode: 0o700 });
  try {
    execFileSync("/bin/launchctl", ["bootout", `${target}/${label}`], {
      stdio: "ignore",
    });
  } catch {
    /* First install. */
  }
  fs.writeFileSync(destination, plist, { mode: 0o600 });
  execFileSync("/bin/launchctl", ["bootstrap", target, destination], {
    stdio: "inherit",
  });
  console.log("Social Engine runs in the background at http://127.0.0.1:5175.");
} else throw new Error("Use preview, install, or stop");
