import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { db } from "./db";
import { DATA } from "./paths";
import { Client, Draft, platformSchema } from "./types";
import { gate } from "./policy";
import { approve } from "./approvals";
import { logDecision, ruleApprovalsToday } from "./decisions";
import { byStatus } from "./ops";

// Jay's standing approval rule. Deterministic code only: no model call decides an approval.
export const ruleFile = () => path.join(DATA, "standing-approval-rule.json");
const ruleSchema = z
  .object({
    version: z.number().int().positive(),
    owner: z.literal("Jay"),
    active: z.boolean(),
    revoked: z.boolean(),
    expires_at: z.string().datetime({ offset: true }),
    client: z.literal("demos"),
    platforms: z.array(platformSchema).min(1),
    max_per_day: z.number().int().min(0),
    require_no_gate_issues: z.literal(true),
    prohibited_patterns: z.array(z.string().min(1)).min(1),
    notes: z.string().default(""),
  })
  .strict()
  .superRefine((v, ctx) => {
    for (const p of v.prohibited_patterns)
      try {
        new RegExp(p, "i");
      } catch {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["prohibited_patterns"],
          message: `Invalid pattern: ${p}`,
        });
      }
  });
export type Rule = z.infer<typeof ruleSchema>;
export type RuleState =
  "missing" | "inactive" | "expired" | "revoked" | "active";
export const defaultRule: Rule = {
  version: 1,
  owner: "Jay",
  active: false,
  revoked: false,
  expires_at: "2026-11-15T23:59:59Z",
  client: "demos",
  platforms: ["x"],
  max_per_day: 3,
  require_no_gate_issues: true,
  prohibited_patterns: [
    "token",
    "TGE",
    "presale",
    "sale",
    "price",
    "airdrop",
    "listing",
    "returns",
    "APY",
    "yield",
    "mainnet (is )?(now )?live",
    "Nov(ember)?\\.?\\s*15",
    "launch date",
    "countdown",
    "partnership",
    "partnered",
    "security finding",
    "vulnerabilit",
    "exploit",
  ],
  notes:
    "Created inactive. Only Jay may set active:true. Approves text-only Demos X posts in needs_review that pass every check; never hands off, schedules or publishes. Set revoked:true or delete this file to stop it.",
};
export function ensureRuleFile() {
  try {
    fs.writeFileSync(ruleFile(), `${JSON.stringify(defaultRule, null, 2)}\n`, {
      flag: "wx",
      mode: 0o600,
    });
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
  }
}
export function standingRule(now = new Date()): {
  rule: Rule | null;
  state: RuleState;
  error?: string;
} {
  let raw: string;
  try {
    const stat = fs.lstatSync(ruleFile());
    if (
      !stat.isFile() ||
      stat.mode & 0o022 ||
      (process.getuid && stat.uid !== process.getuid())
    )
      return {
        rule: null,
        state: "missing",
        error: "Rule file must be a regular file only you can write",
      };
    raw = fs.readFileSync(ruleFile(), "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT")
      return { rule: null, state: "missing" };
    return { rule: null, state: "missing", error: (e as Error).message };
  }
  let rule: Rule;
  try {
    rule = ruleSchema.parse(JSON.parse(raw));
  } catch (e) {
    return {
      rule: null,
      state: "missing",
      error: `Rule file is invalid: ${(e as Error).message}`,
    };
  }
  const state: RuleState = rule.revoked
    ? "revoked"
    : Date.parse(rule.expires_at) <= now.getTime()
      ? "expired"
      : rule.active
        ? "active"
        : "inactive";
  return { rule, state };
}
// Reasons this item may not be approved by the rule. Empty means it passes.
export function ruleReasons(c: Client, d: Draft, rule: Rule) {
  const reasons: string[] = [];
  if (c.slug !== rule.client) reasons.push("The rule covers another client");
  if (d.status !== "needs_review") reasons.push(`Status is ${d.status}`);
  if (d.assetIds.length) reasons.push("Media attachments need Jay's review");
  for (const v of d.variants) {
    if (!rule.platforms.includes(v.platform))
      reasons.push(`${v.platform} is outside the rule's platforms`);
    const text = v.text.normalize("NFKC");
    for (const p of rule.prohibited_patterns)
      if (new RegExp(p, "i").test(text))
        reasons.push(`${v.platform} matches prohibited pattern /${p}/i`);
  }
  if (rule.require_no_gate_issues) reasons.push(...gate(c, d));
  return [...new Set(reasons)];
}
export function dryRun(c: Client, rule: Rule, now = new Date()) {
  let left = Math.max(0, rule.max_per_day - ruleApprovalsToday(now));
  return byStatus(c, ["needs_review"]).map((d) => {
    const reasons = ruleReasons(c, d, rule);
    if (!reasons.length) {
      if (left > 0) left--;
      else reasons.push(`Daily limit of ${rule.max_per_day} reached`);
    }
    return { id: d.id, hash: d.hash, pass: !reasons.length, reasons };
  });
}
// Approves passing items only. It never hands off, schedules or publishes.
export function applyRule(c: Client, ruleVersion: number, now = new Date()) {
  const { rule, state } = standingRule(now);
  if (!rule || state !== "active")
    throw new Error(`The standing rule is ${state}; nothing was applied`);
  if (rule.version !== ruleVersion)
    throw new Error(
      `The standing rule is now version ${rule.version}; review it again`,
    );
  const actor = `standing-rule v${rule.version}`;
  let used = ruleApprovalsToday(now);
  const results = byStatus(c, ["needs_review"]).map((d) => {
    const reasons = ruleReasons(c, d, rule);
    if (!reasons.length && used >= rule.max_per_day)
      reasons.push(`Daily limit of ${rule.max_per_day} reached`);
    if (reasons.length)
      return { id: d.id, hash: d.hash, result: "skipped", reasons };
    const entry = {
      actor,
      action: "approve" as const,
      contentId: d.id,
      hash: d.hash,
      ruleVersion: rule.version,
    };
    try {
      // The log line is written before commit, so the daily count can over-count but never under-count.
      db.transaction(() => {
        approve(c, d.id, "operator", d.hash);
        logDecision({ ...entry, result: "ok" });
      })();
      used++;
      return { id: d.id, hash: d.hash, result: "approved", reasons: [] };
    } catch (e) {
      const reason = (e as Error).message;
      logDecision({ ...entry, reasons: [reason], result: "error" });
      return { id: d.id, hash: d.hash, result: "error", reasons: [reason] };
    }
  });
  return { ruleVersion: rule.version, approvedToday: used, results };
}
