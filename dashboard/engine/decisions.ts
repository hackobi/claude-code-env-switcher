import fs from "node:fs";
import path from "node:path";
import { DATA } from "./paths";

export type Decision = {
  at: string;
  actor: string;
  action: "approve" | "reject" | "handoff";
  contentId: string;
  hash: string;
  ruleVersion?: number;
  reasons?: string[];
  result: "ok" | "error";
};
const file = () => path.join(DATA, "approval-decisions.jsonl");

// Append-only audit trail. Each line is one write through an O_APPEND handle.
export function logDecision(entry: Omit<Decision, "at">) {
  const line = Buffer.from(
    `${JSON.stringify({ at: new Date().toISOString(), ...entry })}\n`,
  );
  const fd = fs.openSync(
    file(),
    fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_CREAT,
    0o600,
  );
  try {
    if (fs.writeSync(fd, line) !== line.length)
      throw new Error("Decision log write was incomplete");
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
}
export function decisions(): Decision[] {
  if (!fs.existsSync(file())) return [];
  return fs
    .readFileSync(file(), "utf8")
    .split("\n")
    .flatMap((line, i) => {
      if (!line.trim()) return [];
      try {
        return [JSON.parse(line) as Decision];
      } catch {
        throw new Error(`Decision log line ${i + 1} is unreadable`);
      }
    });
}
// "Today" is the UTC calendar day.
export function ruleApprovalsToday(now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return decisions().filter(
    (d) =>
      d.actor.startsWith("standing-rule v") &&
      d.action === "approve" &&
      d.result === "ok" &&
      d.at.slice(0, 10) === day,
  ).length;
}
