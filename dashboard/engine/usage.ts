import { randomUUID } from "node:crypto";
import { db } from "./db";
import { Client } from "./types";
export type Usage = {
  id: string;
  clientId: string;
  provider: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
  credits: number;
  status: string;
  createdAt: string;
};
export function usage(c: Client) {
  return db
    .prepare(
      "SELECT * FROM usage WHERE clientId=? ORDER BY createdAt DESC LIMIT 500",
    )
    .all(c.id) as Usage[];
}
export function reserve(
  c: Client,
  provider: string,
  model: string,
  usd: number,
  credits = 0,
) {
  return db.transaction(() => {
    const month = new Date().toISOString().slice(0, 7);
    const sum = db
      .prepare(
        "SELECT coalesce(sum(estimatedUsd),0) usd,coalesce(sum(credits),0) credits FROM usage WHERE clientId=? AND substr(createdAt,1,7)=? AND status!='failed'",
      )
      .get(c.id, month) as { usd: number; credits: number };
    if (
      sum.usd + usd > c.llm.monthlyBudget ||
      sum.credits + credits > c.mediaCredits
    )
      throw new Error("This client has reached its monthly budget");
    const id = randomUUID();
    db.prepare("INSERT INTO usage VALUES(?,?,?,?,?,?,?,?,?,?)").run(
      id,
      c.id,
      provider,
      model,
      0,
      0,
      usd,
      credits,
      "reserved",
      new Date().toISOString(),
    );
    return id;
  })();
}
export function settle(
  c: Client,
  id: string,
  inputTokens: number,
  outputTokens: number,
  usd: number,
  credits = 0,
) {
  db.prepare(
    "UPDATE usage SET inputTokens=?,outputTokens=?,estimatedUsd=?,credits=?,status='completed' WHERE clientId=? AND id=?",
  ).run(inputTokens, outputTokens, usd, credits, c.id, id);
}
export function failUsage(c: Client, id: string, uncertain = false) {
  db.prepare("UPDATE usage SET status=? WHERE clientId=? AND id=?").run(
    uncertain ? "unknown" : "failed",
    c.id,
    id,
  );
}
