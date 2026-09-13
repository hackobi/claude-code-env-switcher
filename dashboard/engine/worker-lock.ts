import { randomUUID } from "node:crypto";
import { db } from "./db";

// The transaction serializes startup; a second worker must never reconcile a live request.
export function acquireWorker() {
  const id = randomUUID();
  db.transaction(() => {
    const existing = db
      .prepare("SELECT value FROM metadata WHERE key='worker-lock'")
      .get() as { value: string } | undefined;
    if (existing) {
      const previous = JSON.parse(existing.value) as { pid: number };
      let alive = true;
      try {
        process.kill(previous.pid, 0);
      } catch (e) {
        alive = (e as NodeJS.ErrnoException).code !== "ESRCH";
      }
      if (alive) throw new Error("The Social Engine worker is already running");
    }
    db.prepare("INSERT OR REPLACE INTO metadata VALUES('worker-lock',?)").run(
      JSON.stringify({ id, pid: process.pid }),
    );
  })();
  return () =>
    db
      .prepare("DELETE FROM metadata WHERE key='worker-lock' AND value=?")
      .run(JSON.stringify({ id, pid: process.pid }));
}
