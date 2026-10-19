import { NextResponse } from "next/server";
import { z } from "zod";
import { client } from "../../../../../../engine/clients";
import { migrateLegacy } from "../../../../../../engine/migrate";
import { opsAuthorized } from "../../../../../../engine/ops-token";
import {
  queue,
  view,
  approveItem,
  rejectItem,
  handoffItem,
} from "../../../../../../engine/ops";
import {
  standingRule,
  dryRun,
  applyRule,
} from "../../../../../../engine/standing-rule";
import { ruleApprovalsToday } from "../../../../../../engine/decisions";

// Olympus ops API. Server to server: localhost Host plus the bearer token, no cookies.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ slug: string; resource: string[] }> };
const err = (e: unknown) =>
  NextResponse.json(
    { error: e instanceof Error ? e.message : "Request failed" },
    { status: 400 },
  );
function denied(request: Request) {
  const host = request.headers.get("host")?.split(":")[0];
  if (!["127.0.0.1", "localhost"].includes(host || ""))
    return new NextResponse(
      "Operator workspace is available on localhost only",
      { status: 403 },
    );
  if (!opsAuthorized(request.headers.get("authorization")))
    return new NextResponse(null, { status: 401 });
}
// Only Demos is covered: its handoff is an unscheduled Typefully draft and the rule names it.
async function demos(context: Context) {
  const { slug, resource } = await context.params;
  if (slug !== "demos") return { c: null, path: "" };
  migrateLegacy();
  return { c: client(slug), path: resource.join("/") };
}
const item = z.object({ id: z.string().min(1), hash: z.string().min(1) });
export async function GET(request: Request, context: Context) {
  const refusal = denied(request);
  if (refusal) return refusal;
  try {
    const { c, path } = await demos(context);
    if (!c)
      return NextResponse.json({ error: "Unknown client" }, { status: 404 });
    if (path === "queue") return NextResponse.json(queue(c));
    if (path === "rule") {
      const { rule, state, error } = standingRule();
      return NextResponse.json({
        rule,
        state,
        ...(error ? { error } : {}),
        dryRun: rule ? dryRun(c, rule) : [],
        approvedToday: ruleApprovalsToday(),
      });
    }
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  } catch (e) {
    return err(e);
  }
}
export async function POST(request: Request, context: Context) {
  const refusal = denied(request);
  if (refusal) return refusal;
  try {
    const { c, path } = await demos(context);
    if (!c)
      return NextResponse.json({ error: "Unknown client" }, { status: 404 });
    const body = await request.json();
    switch (path) {
      case "approve": {
        const { id, hash } = item.strict().parse(body);
        return NextResponse.json({ item: view(c, approveItem(c, id, hash)) });
      }
      case "reject": {
        const { id, hash, reason } = item
          .extend({ reason: z.string().trim().max(2000).optional() })
          .strict()
          .parse(body);
        return NextResponse.json({
          item: view(c, rejectItem(c, id, hash, reason || undefined)),
        });
      }
      case "handoff": {
        // Strict: a `when` or any schedule field is refused before anything runs.
        const { id, hash } = item.strict().parse(body);
        const d = await handoffItem(c, id, hash);
        return NextResponse.json({
          item: view(c, d),
          externalId: d.externalId,
          scheduledFor: d.scheduledFor,
        });
      }
      case "rule/apply": {
        const { ruleVersion } = z
          .object({ ruleVersion: z.number().int().positive() })
          .strict()
          .parse(body);
        return NextResponse.json(applyRule(c, ruleVersion));
      }
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 404 });
    }
  } catch (e) {
    return err(e);
  }
}
