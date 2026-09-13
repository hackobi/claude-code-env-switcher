import fs from "node:fs";
import path from "node:path";
import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { db } from "./db";
import { DATA } from "./paths";
import { Client, Provider, providerSchema } from "./types";

function masterKey() {
  const file = path.join(DATA, "credential.key");
  try {
    fs.writeFileSync(file, randomBytes(32), { flag: "wx", mode: 0o600 });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
  return fs.readFileSync(file);
}
export function saveCredential(c: Client, provider: Provider, key: string) {
  providerSchema.parse(provider);
  if (key.length < 10 || key.length > 4096 || /[\r\n]/.test(key))
    throw new Error("Invalid API key");
  const iv = randomBytes(12),
    cipher = createCipheriv("aes-256-gcm", masterKey(), iv);
  cipher.setAAD(Buffer.from(`${c.id}:${provider}`));
  const encrypted = Buffer.concat([cipher.update(key, "utf8"), cipher.final()]);
  const sealed = [iv, cipher.getAuthTag(), encrypted]
    .map((b) => b.toString("base64"))
    .join(".");
  db.prepare("INSERT OR REPLACE INTO credentials VALUES(?,?,?)").run(
    c.id,
    provider,
    sealed,
  );
}
export function credential(c: Client, provider: Provider): string {
  const row = db
    .prepare("SELECT sealed FROM credentials WHERE clientId=? AND provider=?")
    .get(c.id, provider) as { sealed: string } | undefined;
  if (row) {
    const [iv, tag, data] = row.sealed
      .split(".")
      .map((v) => Buffer.from(v, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", masterKey(), iv);
    decipher.setAAD(Buffer.from(`${c.id}:${provider}`));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8",
    );
  }
  const envName =
    provider === "rapidapi"
      ? "RAPIDAPI_KEY"
      : `${provider.toUpperCase()}_API_KEY`;
  const scoped =
    process.env[`${c.slug.toUpperCase().replace(/-/g, "_")}__${envName}`];
  if (scoped) return scoped;
  const shareable = ["anthropic", "openai", "zernio", "apify"].includes(
    provider,
  );
  const value =
    shareable || c.slug === "demos" ? process.env[envName] || "" : "";
  return value.startsWith("your_") ? "" : value;
}
export function credentialStatus(c: Client) {
  return providerSchema.options.map((provider) => ({
    provider,
    configured: !!credential(c, provider),
    source: db
      .prepare("SELECT 1 FROM credentials WHERE clientId=? AND provider=?")
      .get(c.id, provider)
      ? "client"
      : "environment",
  }));
}
