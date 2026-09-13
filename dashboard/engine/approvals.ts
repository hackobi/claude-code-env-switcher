import { randomBytes } from "node:crypto";
import { db } from "./db";
import { Client } from "./types";
import { forClient, sha } from "./repository";
import { gate, roles } from "./policy";
import { clientById } from "./clients";

export function approve(
  c: Client,
  id: string,
  role: "operator" | "owner",
  expectedHash: string,
) {
  return db.transaction(() => {
    const repo = forClient(c),
      d = repo.get(id);
    if (d.hash !== expectedHash)
      throw new Error("Content changed. Review the latest version.");
    if (!["needs_review", "draft", "approved"].includes(d.status))
      throw new Error("Content cannot be approved in this state");
    const issues = gate(c, d);
    if (issues.length) throw new Error(issues.join("; "));
    if (!roles(c).includes(role))
      throw new Error("Approval role is not required");
    db.prepare("INSERT OR IGNORE INTO approvals VALUES(?,?,?,?,?)").run(
      c.id,
      id,
      d.hash,
      role,
      new Date().toISOString(),
    );
    if (roles(c).every((r) => repo.get(id).approvals.includes(r)))
      db.prepare(
        "UPDATE content SET status='approved' WHERE clientId=? AND id=?",
      ).run(c.id, id);
    return repo.get(id);
  })();
}
export function reviewLink(c: Client, id: string) {
  if (c.industry !== "restaurant")
    throw new Error("Owner review links are for restaurant clients");
  const d = forClient(c).get(id);
  if (!["needs_review", "approved"].includes(d.status))
    throw new Error("This item is not awaiting review");
  const token = randomBytes(32).toString("base64url");
  db.prepare("INSERT INTO review_links VALUES(?,?,?,?,?,0)").run(
    sha(token),
    c.id,
    id,
    d.hash,
    new Date(Date.now() + 48 * 3600000).toISOString(),
  );
  return token;
}
export function resolveReview(token: string) {
  const r = db
    .prepare(
      "SELECT * FROM review_links WHERE tokenHash=? AND used=0 AND expiresAt>?",
    )
    .get(sha(token), new Date().toISOString()) as
    { clientId: string; contentId: string; contentHash: string } | undefined;
  if (!r) throw new Error("This review link is expired or already used");
  const c = clientById(r.clientId),
    d = forClient(c).get(r.contentId);
  if (d.hash !== r.contentHash)
    throw new Error("Content has changed. Request a new review link.");
  if (!["needs_review", "draft", "approved"].includes(d.status))
    throw new Error("This content is no longer awaiting approval");
  return { client: c, draft: d };
}
export function decideReview(token: string, decision: string) {
  return db.transaction(() => {
    const { client: c, draft: d } = resolveReview(token);
    if (decision === "approve") approve(c, d.id, "owner", d.hash);
    else if (decision === "reject" || decision === "changes") {
      db.prepare("UPDATE content SET status=? WHERE clientId=? AND id=?").run(
        decision === "reject" ? "rejected" : "changes_requested",
        c.id,
        d.id,
      );
      db.prepare("DELETE FROM approvals WHERE clientId=? AND contentId=?").run(
        c.id,
        d.id,
      );
    } else throw new Error("Invalid review decision");
    db.prepare("UPDATE review_links SET used=1 WHERE tokenHash=?").run(
      sha(token),
    );
  })();
}
