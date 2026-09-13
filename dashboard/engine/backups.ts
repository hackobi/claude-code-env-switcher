import fs from "node:fs";
import path from "node:path";
import { db } from "./db";
import { DATA } from "./paths";

export async function dailyBackup() {
  const day = new Date().toISOString().slice(0, 10);
  const root = path.join(DATA, "backups"),
    dest = path.join(root, day);
  if (fs.existsSync(path.join(dest, "complete"))) return;
  fs.mkdirSync(dest, { recursive: true, mode: 0o700 });
  await db.backup(path.join(dest, "engine.db"));
  for (const name of ["credential.key", "media"]) {
    const source = path.join(DATA, name);
    if (fs.existsSync(source))
      fs.cpSync(source, path.join(dest, name), { recursive: true });
  }
  fs.writeFileSync(path.join(dest, "complete"), new Date().toISOString(), {
    mode: 0o600,
  });
  // Only remove this application's dated backup directories, never live data.
  const days = fs
    .readdirSync(root)
    .filter((v) => /^\d{4}-\d{2}-\d{2}$/.test(v))
    .sort()
    .reverse();
  for (const old of days.slice(7))
    fs.rmSync(path.join(root, old), { recursive: true, force: true });
}
