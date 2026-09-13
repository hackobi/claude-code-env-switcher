import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { db } from "./db";
import { client, seedDemos } from "./clients";
import { forClient, sha } from "./repository";
import { ROOT, mediaPath } from "./paths";

export function migrateLegacy() {
  seedDemos();
  if (db.prepare("SELECT 1 FROM metadata WHERE key=?").get("legacy-import-v1"))
    return;
  const oldPath = path.join(ROOT, "data", "marketing.db");
  if (!fs.existsSync(oldPath)) return;
  const legacy = new Database(oldPath, { readonly: true, fileMustExist: true });
  const c = client("demos"),
    repo = forClient(c);
  const rows = legacy.prepare("SELECT * FROM generated_content").all() as {
    id: number;
    content: string;
    image_path: string | null;
    source_context: string | null;
    source_type: string;
  }[];
  const tweets = legacy
    .prepare("SELECT id,text,author_username,created_at FROM tweets")
    .all() as {
    id: string;
    text: string;
    author_username: string;
    created_at: string;
  }[];
  try {
    db.transaction(() => {
      if (
        db.prepare("SELECT 1 FROM metadata WHERE key=?").get("legacy-import-v1")
      )
        return;
      let imported = 0;
      for (const row of rows) {
        if (
          row.source_type === "fallback_demo" ||
          row.source_context?.includes("fallback_demo")
        )
          continue;
        const assetIds: string[] = [];
        if (row.image_path?.startsWith("data:image/png;base64,")) {
          const bytes = Buffer.from(row.image_path.split(",")[1], "base64"),
            id = `legacy-${row.id}`,
            out = mediaPath(c.id, `${id}.png`);
          fs.writeFileSync(out, bytes, { mode: 0o600 });
          repo.addAsset({
            id,
            clientId: c.id,
            name: `Demos graphic ${row.id}`,
            path: out,
            mime: "image/png",
            sha: sha(bytes),
            kind: "graphic",
            ai: true,
            alcohol: false,
            consent: true,
            sourceId: null,
            createdAt: new Date().toISOString(),
          });
          assetIds.push(id);
        }
        repo.save({
          title: row.content.slice(0, 100),
          variants: [{ platform: "x", text: row.content }],
          assetIds,
          notes: `Imported Demos draft ${row.id}. Recheck historical claims before use.`,
        });
        imported++;
      }
      for (const t of tweets)
        repo.addSignal({
          source: "legacy_tweet",
          title: t.text.slice(0, 100),
          text: t.text,
          url: `https://x.com/${t.author_username || "i"}/status/${t.id}`,
        });
      db.prepare("INSERT INTO metadata VALUES(?,?)").run(
        "legacy-import-v1",
        JSON.stringify({
          drafts: imported,
          tweets: tweets.length,
          date: new Date().toISOString(),
        }),
      );
    })();
  } finally {
    legacy.close();
  }
}
