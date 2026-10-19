import { db } from "./db";
import { Client, Draft } from "./types";
import { forClient } from "./repository";
import { gate } from "./policy";
import { approve } from "./approvals";
import { publicationCheck, publish } from "./publish";
import { logDecision } from "./decisions";

// Operations for Olympus. Every state change goes through approve(), repo.reject() or publish().
export const OLYMPUS = "jay via olympus";
export function byStatus(c: Client, statuses: string[]): Draft[] {
  const repo = forClient(c);
  return (
    db
      .prepare(
        `SELECT id FROM content WHERE clientId=? AND status IN (${statuses.map(() => "?").join(",")}) ORDER BY createdAt, id`,
      )
      .all(c.id, ...statuses) as { id: string }[]
  ).map((r) => repo.get(r.id));
}
export const view = (c: Client, d: Draft) => ({
  id: d.id,
  title: d.title,
  hash: d.hash,
  status: d.status,
  createdAt: d.createdAt,
  variants: d.variants.map(({ platform, text }) => ({ platform, text })),
  assetIds: d.assetIds,
  gateIssues: gate(c, d),
});
export function queue(c: Client) {
  const counts = Object.fromEntries(
    (
      db
        .prepare(
          "SELECT status,count(*) AS n FROM content WHERE clientId=? GROUP BY status",
        )
        .all(c.id) as { status: string; n: number }[]
    ).map((r) => [r.status, r.n]),
  );
  return {
    items: byStatus(c, ["needs_review", "approved", "changes_requested"]).map(
      (d) => view(c, d),
    ),
    counts,
  };
}
function logged<T>(
  action: "approve" | "reject" | "handoff",
  id: string,
  hash: string,
  run: () => T,
  reasons?: string[],
): T {
  try {
    // Synchronous actions log inside the transaction: no change commits without its record.
    return db.transaction(() => {
      const out = run();
      logDecision({
        actor: OLYMPUS,
        action,
        contentId: id,
        hash,
        reasons,
        result: "ok",
      });
      return out;
    })();
  } catch (e) {
    logDecision({
      actor: OLYMPUS,
      action,
      contentId: id,
      hash,
      reasons: [...(reasons || []), (e as Error).message],
      result: "error",
    });
    throw e;
  }
}
export function approveItem(c: Client, id: string, hash: string) {
  return logged("approve", id, hash, () => approve(c, id, "operator", hash));
}
export function rejectItem(
  c: Client,
  id: string,
  hash: string,
  reason?: string,
) {
  return logged(
    "reject",
    id,
    hash,
    () => {
      const repo = forClient(c);
      if (repo.get(id).hash !== hash)
        throw new Error("Content changed. Review the latest version.");
      repo.reject(id);
      return repo.get(id);
    },
    reason ? [reason] : undefined,
  );
}
// Hands an approved Demos item to Typefully as an unscheduled draft. No publish time is ever passed.
export async function handoffItem(c: Client, id: string, hash: string) {
  const entry = {
    actor: OLYMPUS,
    action: "handoff" as const,
    contentId: id,
    hash,
  };
  try {
    const d = forClient(c).get(id);
    if (d.hash !== hash) throw new Error("Content changed; review it again");
    if (publicationCheck(c, d).provider !== "typefully")
      throw new Error("Olympus hands off only unscheduled Typefully drafts");
    const out = await publish(c, id, hash);
    if (out.status !== "handed_off" || out.scheduledFor)
      throw new Error(
        `Handoff ended as ${out.status}${out.scheduledFor ? ` for ${out.scheduledFor}` : ""}; check Typefully`,
      );
    logDecision({ ...entry, result: "ok" });
    return out;
  } catch (e) {
    logDecision({ ...entry, reasons: [(e as Error).message], result: "error" });
    throw e;
  }
}
