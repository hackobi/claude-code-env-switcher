import { createHash, randomUUID } from "node:crypto";
import { db } from "./db";
import { Client, Draft, DraftInput, Asset, Signal, draftSchema } from "./types";

export const sha = (value: string | Buffer) =>
  createHash("sha256").update(value).digest("hex");
type ContentRow = {
  id: string;
  clientId: string;
  body: string;
  status: string;
  hash: string;
  createdAt: string;
  scheduledFor: string | null;
  externalId: string | null;
  externalProvider: string | null;
};
export function forClient(c: Client) {
  const map = (r: ContentRow): Draft => ({
    ...JSON.parse(r.body),
    ...r,
    approvals: (
      db
        .prepare(
          "SELECT role FROM approvals WHERE clientId=? AND contentId=? AND hash=?",
        )
        .all(c.id, r.id, r.hash) as { role: string }[]
    ).map((a) => a.role),
  });
  function asset(id: string): Asset {
    const r = db
      .prepare("SELECT body FROM assets WHERE clientId=? AND id=?")
      .get(c.id, id) as { body: string } | undefined;
    if (!r) throw new Error("Asset not found for this client");
    return JSON.parse(r.body);
  }
  function get(id: string): Draft {
    const row = db
      .prepare("SELECT * FROM content WHERE clientId=? AND id=?")
      .get(c.id, id) as ContentRow | undefined;
    if (!row) throw new Error("Content not found for this client");
    return map(row);
  }
  function save(input: unknown, id?: string): Draft {
    const body = draftSchema.parse(input);
    if (body.variants.some((v) => !c.channels.includes(v.platform)))
      throw new Error("A variant targets a channel outside this client");
    if (
      new Set(body.variants.map((v) => v.platform)).size !==
      body.variants.length
    )
      throw new Error("One variant per channel is required");
    const media = body.assetIds.map(asset);
    const hash = sha(
      JSON.stringify({ ...body, media: media.map((a) => a.sha) }),
    );
    const createdAt = new Date().toISOString();
    const contentId = id || randomUUID();
    db.transaction(() => {
      if (id) {
        const previous = get(id);
        if (
          [
            "dispatching",
            "handed_off",
            "scheduled",
            "published",
            "delivery_unknown",
          ].includes(previous.status)
        )
          throw new Error(
            "This content has been handed off; duplicate it to create a new version",
          );
        db.prepare(
          "UPDATE content SET body=?,hash=?,status='needs_review' WHERE clientId=? AND id=?",
        ).run(JSON.stringify(body), hash, c.id, id);
        db.prepare(
          "DELETE FROM approvals WHERE clientId=? AND contentId=?",
        ).run(c.id, id);
        db.prepare(
          "DELETE FROM review_links WHERE clientId=? AND contentId=?",
        ).run(c.id, id);
      } else
        db.prepare(
          "INSERT INTO content(id,clientId,body,status,hash,createdAt) VALUES(?,?,?,?,?,?)",
        ).run(
          contentId,
          c.id,
          JSON.stringify(body),
          "needs_review",
          hash,
          createdAt,
        );
    })();
    return get(contentId);
  }
  return {
    get,
    save,
    asset,
    list: () =>
      (
        db
          .prepare(
            "SELECT * FROM content WHERE clientId=? ORDER BY createdAt DESC LIMIT 300",
          )
          .all(c.id) as ContentRow[]
      ).map(map),
    assets: () =>
      (
        db.prepare("SELECT body FROM assets WHERE clientId=?").all(c.id) as {
          body: string;
        }[]
      ).map((r) => JSON.parse(r.body) as Asset),
    addAsset: (a: Asset) => {
      if (a.clientId !== c.id) throw new Error("Asset ownership mismatch");
      db.prepare("INSERT INTO assets VALUES(?,?,?)").run(
        a.id,
        c.id,
        JSON.stringify(a),
      );
      return a;
    },
    signals: () =>
      db
        .prepare(
          "SELECT * FROM signals WHERE clientId=? ORDER BY fetchedAt DESC LIMIT 100",
        )
        .all(c.id) as Signal[],
    addSignal: (s: Omit<Signal, "id" | "clientId" | "fetchedAt">) =>
      db
        .prepare("INSERT OR IGNORE INTO signals VALUES(?,?,?,?,?,?,?)")
        .run(
          randomUUID(),
          c.id,
          s.source,
          s.title,
          s.text,
          s.url,
          new Date().toISOString(),
        ),
    reject: (id: string) => {
      const d = get(id);
      if (!["needs_review", "approved", "draft"].includes(d.status))
        throw new Error("Content cannot be rejected in this state");
      db.prepare(
        "UPDATE content SET status='rejected' WHERE clientId=? AND id=?",
      ).run(c.id, id);
    },
  };
}
