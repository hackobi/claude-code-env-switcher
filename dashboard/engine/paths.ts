import fs from "node:fs";
import path from "node:path";

export const ROOT =
  process.env.SOCIAL_ENGINE_ROOT ||
  (fs.existsSync(path.join(process.cwd(), "dashboard"))
    ? process.cwd()
    : path.resolve(process.cwd(), ".."));
export const DATA =
  process.env.SOCIAL_ENGINE_DATA || path.join(ROOT, "data", "social-engine");
fs.mkdirSync(DATA, { recursive: true, mode: 0o700 });
if (!process.env.SOCIAL_ENGINE_TEST && fs.existsSync(path.join(ROOT, ".env")))
  process.loadEnvFile(path.join(ROOT, ".env"));
export function mediaPath(clientId: string, name: string) {
  if (!/^[a-zA-Z0-9-]+$/.test(clientId) || path.basename(name) !== name)
    throw new Error("Invalid media path");
  const dir = path.join(DATA, "media", clientId);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, name);
}
