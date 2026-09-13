import { db } from "./db";
import { clients, clientById } from "./clients";
import { claim, progress, finish, heartbeat, enqueue } from "./jobs";
import { ingest } from "./sources";
import { generate } from "./generate";
import { generateMedia } from "./higgsfield";
import { migrateLegacy } from "./migrate";
import { sync } from "./publish";
import { Job } from "./types";
import { acquireWorker } from "./worker-lock";
import { dailyBackup } from "./backups";

const release = acquireWorker();
migrateLegacy();
// Never replay an interrupted paid request: its vendor-side outcome can be unknown.
db.prepare(
  "UPDATE jobs SET status='failed',error='Worker restarted during a request. Check provider activity before retrying.',progress='Needs reconciliation' WHERE status='running'",
).run();
db.prepare(
  "UPDATE content SET status='delivery_unknown' WHERE status='dispatching'",
).run();
let stop = false;
process.on("SIGTERM", () => {
  stop = true;
});
process.on("SIGINT", () => {
  stop = true;
});
const heart = setInterval(heartbeat, 15000);
heartbeat();
async function work(job: Job) {
  const c = clientById(job.clientId),
    payload = JSON.parse(job.payload);
  try {
    if (job.type === "generate") {
      progress(job, "Collecting this client’s sources");
      const notes = await ingest(c, payload.brief || "");
      progress(job, "Writing channel-specific drafts");
      const drafts = await generate(c, payload.brief || "");
      finish(job, { draftIds: drafts.map((d) => d.id), sourceWarnings: notes });
    } else {
      progress(job, "Generating media with Higgsfield");
      const asset = await generateMedia(
        c,
        payload.prompt,
        payload.mode,
        payload.sourceId,
      );
      finish(job, { assetId: asset.id });
    }
  } catch (e) {
    finish(job, null, (e as Error).message);
  }
}
async function loop() {
  let lastSync = 0;
  while (!stop) {
    for (const c of clients()) {
      if (c.automation.enabled) {
        const last = db
          .prepare(
            "SELECT createdAt FROM jobs WHERE clientId=? AND type=? ORDER BY createdAt DESC LIMIT 1",
          )
          .get(c.id, "generate") as { createdAt: string } | undefined;
        if (
          !last ||
          Date.now() - Date.parse(last.createdAt) >
            c.automation.intervalHours * 3600000
        ) {
          try {
            enqueue(c, "generate", { brief: c.automation.brief });
          } catch {
            /* An active run owns this client. */
          }
        }
      }
    }
    const job = claim();
    if (job) await work(job);
    if (Date.now() - lastSync > 15 * 60000) {
      try {
        await dailyBackup();
        db.prepare("DELETE FROM metadata WHERE key='backup-error'").run();
      } catch (e) {
        db.prepare("INSERT OR REPLACE INTO metadata VALUES(?,?)").run(
          "backup-error",
          JSON.stringify({
            at: new Date().toISOString(),
            error: (e as Error).message,
          }),
        );
      }
      for (const c of clients()) {
        try {
          await sync(c);
          db.prepare("DELETE FROM metadata WHERE key=?").run(
            `sync-error:${c.id}`,
          );
        } catch (e) {
          db.prepare("INSERT OR REPLACE INTO metadata VALUES(?,?)").run(
            `sync-error:${c.id}`,
            JSON.stringify({
              at: new Date().toISOString(),
              error: (e as Error).message,
            }),
          );
        }
      }
      lastSync = Date.now();
    }
    if (!job) await new Promise((r) => setTimeout(r, 2000));
  }
  clearInterval(heart);
  release();
  db.close();
}
loop().catch((e) => {
  console.error("Worker stopped:", e.message);
  process.exitCode = 1;
  clearInterval(heart);
  release();
});
