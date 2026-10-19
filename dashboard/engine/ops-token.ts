import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

// Olympus calls the ops API server to server. The bearer token lives only in this file.
export const opsTokenFile = () =>
  path.join(os.homedir(), ".config", "olympus", "social-engine-token");

export function ensureOpsToken() {
  const file = opsTokenFile(),
    dir = path.dirname(file);
  if (!fs.existsSync(file)) {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    fs.chmodSync(dir, 0o700);
    // Write privately, then link into place so no reader ever sees a partial token.
    const temp = `${file}.${randomBytes(6).toString("hex")}.tmp`;
    fs.writeFileSync(temp, randomBytes(32).toString("base64url"), {
      flag: "wx",
      mode: 0o600,
    });
    try {
      fs.linkSync(temp, file);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    } finally {
      fs.unlinkSync(temp);
    }
  }
  const stat = fs.lstatSync(file);
  if (
    !stat.isFile() ||
    stat.mode & 0o077 ||
    (process.getuid && stat.uid !== process.getuid())
  )
    throw new Error(
      `${file} must be a regular file owned by you with mode 0600`,
    );
  const token = fs.readFileSync(file, "utf8").trim();
  if (!/^[A-Za-z0-9_-]{43,}$/.test(token))
    throw new Error(`${file} does not hold a valid token`);
  return token;
}

const digest = (value: string) => createHash("sha256").update(value).digest();
export function opsAuthorized(header: string | null) {
  const supplied = /^Bearer ([A-Za-z0-9_-]+)$/.exec(header || "")?.[1];
  if (!supplied) return false;
  let expected: string;
  try {
    expected = ensureOpsToken();
  } catch (e) {
    console.error("Ops API token unavailable:", (e as Error).message);
    return false;
  }
  return timingSafeEqual(digest(supplied), digest(expected));
}
