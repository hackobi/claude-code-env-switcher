import { randomUUID } from "node:crypto";
import { db } from "./db";
import { Client, Profile, profileSchema } from "./types";

type Row = { id: string; slug: string; profile: string; createdAt: string };
const map = (r: Row): Client => ({
  ...JSON.parse(r.profile),
  id: r.id,
  createdAt: r.createdAt,
});
export function clients(): Client[] {
  return (
    db.prepare("SELECT * FROM clients ORDER BY createdAt").all() as Row[]
  ).map(map);
}
export function client(slug: string): Client {
  const row = db.prepare("SELECT * FROM clients WHERE slug=?").get(slug) as
    Row | undefined;
  if (!row) throw new Error("Client not found");
  return map(row);
}
export function clientById(id: string): Client {
  const row = db.prepare("SELECT * FROM clients WHERE id=?").get(id) as
    Row | undefined;
  if (!row) throw new Error("Client not found");
  return map(row);
}
export function createClient(input: unknown): Client {
  const profile = profileSchema.parse(input),
    id = randomUUID(),
    createdAt = new Date().toISOString();
  db.prepare("INSERT INTO clients VALUES(?,?,?,?)").run(
    id,
    profile.slug,
    JSON.stringify(profile),
    createdAt,
  );
  return { ...profile, id, createdAt };
}
export function updateClient(c: Client, input: unknown): Client {
  const profile = profileSchema.parse(input);
  if (profile.slug !== c.slug || profile.industry !== c.industry)
    throw new Error("Client identity cannot change; create another workspace");
  db.transaction(() => {
    if (
      db
        .prepare(
          "SELECT 1 FROM content WHERE clientId=? AND status='dispatching'",
        )
        .get(c.id)
    )
      throw new Error(
        "A publishing handoff is in progress. Wait for it to finish before changing this profile.",
      );
    db.prepare("UPDATE clients SET profile=? WHERE id=?").run(
      JSON.stringify(profile),
      c.id,
    );
    db.prepare(
      "UPDATE content SET status='needs_review' WHERE clientId=? AND status IN ('approved','draft','needs_review')",
    ).run(c.id);
    db.prepare(
      "DELETE FROM approvals WHERE clientId=? AND contentId IN (SELECT id FROM content WHERE clientId=? AND status IN ('needs_review','rejected','changes_requested'))",
    ).run(c.id, c.id);
    db.prepare("DELETE FROM review_links WHERE clientId=?").run(c.id);
  })();
  return { ...profile, id: c.id, createdAt: c.createdAt };
}
export function profileOf(c: Client): Profile {
  const { id, createdAt, ...p } = c;
  return p;
}
export function readiness(c: Client): string[] {
  const missing: string[] = [];
  if (!c.description) missing.push("Business description");
  if (!c.facts) missing.push("Verified facts, offers or product details");
  if (!c.audience) missing.push("Target audience");
  if (c.industry === "restaurant") {
    if (!c.restaurant?.menu) missing.push("Menu and prices");
    if (!c.restaurant?.address) missing.push("Restaurant address");
    if (!c.approver.email) missing.push("Owner approver email");
    if (c.restaurant?.alcohol && !c.restaurant?.licenceHolder)
      missing.push("Licence holder");
  }
  return missing;
}
export function seedDemos() {
  db.transaction(() => {
    if (db.prepare("SELECT 1 FROM clients WHERE slug=?").get("demos")) return;
    createClient({
      slug: "demos",
      name: "Demos Network",
      industry: "technology",
      description: "Blockchain infrastructure and developer tools.",
      website: "https://demos.sh",
      audience: "Developers and teams building across blockchains",
      voice:
        "Clear, technical, evidence-led. Explain concrete value without hype.",
      facts:
        "Only make product claims supported by the supplied brief and verified sources. Historical drafts are not evidence of current capabilities.",
      keywords: [
        "Demos",
        "interoperability",
        "identity",
        "blockchain",
        "developer",
      ],
      channels: ["x", "threads", "linkedin", "bluesky"],
      sources: ["brief", "rapidapi"],
      color: "#ff6b35",
    });
  })();
}
