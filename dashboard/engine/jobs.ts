import { randomUUID } from "node:crypto";
import { db } from "./db";
import { Client, Job } from "./types";
export function jobs(c: Client) {
  return db
    .prepare(
      "SELECT * FROM jobs WHERE clientId=? ORDER BY createdAt DESC LIMIT 30",
    )
    .all(c.id) as Job[];
}
export function enqueue(c: Client, type: Job["type"], payload: object) {
  const id = randomUUID(),
    time = new Date().toISOString();
  try {
    db.prepare("INSERT INTO jobs VALUES(?,?,?,?,?,?,?,?,?,?)").run(
      id,
      c.id,
      type,
      JSON.stringify(payload),
      "queued",
      "Waiting for worker",
      null,
      time,
      time,
      null,
    );
  } catch (e) {
    if (String(e).includes("UNIQUE"))
      throw new Error("This client already has a run queued or running");
    throw e;
  }
  return jobs(c).find((j) => j.id === id)!;
}
export function claim(): Job | undefined {
  return db.transaction(() => {
    const job = db
      .prepare(
        "SELECT * FROM jobs WHERE status='queued' ORDER BY createdAt LIMIT 1",
      )
      .get() as Job | undefined;
    if (!job) return;
    db.prepare(
      "UPDATE jobs SET status='running',updatedAt=?,progress='Starting' WHERE id=? AND status='queued'",
    ).run(new Date().toISOString(), job.id);
    return job;
  })();
}
export function progress(job: Job, message: string) {
  db.prepare(
    "UPDATE jobs SET progress=?,updatedAt=? WHERE clientId=? AND id=?",
  ).run(message, new Date().toISOString(), job.clientId, job.id);
}
export function finish(job: Job, result: unknown, error?: string) {
  db.prepare(
    "UPDATE jobs SET status=?,progress=?,result=?,error=?,updatedAt=? WHERE clientId=? AND id=?",
  ).run(
    error ? "failed" : "completed",
    error ? "Needs attention" : "Completed",
    JSON.stringify(result),
    error || null,
    new Date().toISOString(),
    job.clientId,
    job.id,
  );
}
export function heartbeat() {
  db.prepare("INSERT OR REPLACE INTO metadata VALUES(?,?)").run(
    "worker-heartbeat",
    new Date().toISOString(),
  );
}
export function workerHealthy() {
  const r = db
    .prepare("SELECT value FROM metadata WHERE key=?")
    .get("worker-heartbeat") as { value: string } | undefined;
  return !!r && Date.now() - Date.parse(r.value) < 90000;
}
