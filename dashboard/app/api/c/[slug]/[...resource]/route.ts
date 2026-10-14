import { NextResponse } from "next/server";
import fs from "node:fs";
import { z } from "zod";
import { client, updateClient, readiness } from "../../../../../engine/clients";
import { forClient } from "../../../../../engine/repository";
import {
  credentialStatus,
  saveCredential,
} from "../../../../../engine/credentials";
import {
  connections,
  discover,
  bind,
  testConnection,
  connectURL,
} from "../../../../../engine/connections";
import { providerSchema, platformSchema } from "../../../../../engine/types";
import { approve, reviewLink } from "../../../../../engine/approvals";
import { publish, sync } from "../../../../../engine/publish";
import { gate, roles } from "../../../../../engine/policy";
import { jobs, enqueue, workerHealthy } from "../../../../../engine/jobs";
import { usage } from "../../../../../engine/usage";
import { upload, graphic } from "../../../../../engine/media";
import { higgsStatus } from "../../../../../engine/higgsfield";
import { migrateLegacy } from "../../../../../engine/migrate";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type Context = { params: Promise<{ slug: string; resource: string[] }> };
const err = (e: unknown) =>
  NextResponse.json(
    { error: e instanceof Error ? e.message : "Request failed" },
    { status: 400 },
  );
export async function GET(_request: Request, context: Context) {
  try {
    migrateLegacy();
    const { slug, resource } = await context.params,
      c = client(slug),
      repo = forClient(c);
    if (resource[0] === "overview")
      return NextResponse.json({
        client: c,
        items: repo.list().map((d) => ({ ...d, gate: gate(c, d) })),
        assets: repo.assets().map(({ path, ...a }) => a),
        signals: repo.signals(),
        jobs: jobs(c),
        usage: usage(c),
        connections: connections(c),
        credentials: credentialStatus(c),
        missing: readiness(c),
        roles: roles(c),
        workerHealthy: workerHealthy(),
      });
    if (resource[0] === "assets" && resource[1]) {
      const a = repo.asset(resource[1]);
      return new Response(new Uint8Array(fs.readFileSync(a.path)), {
        headers: {
          "Content-Type": a.mime,
          "Cache-Control": "private, no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }
    if (resource[0] === "higgsfield")
      return NextResponse.json(await higgsStatus());
    return NextResponse.json({ error: "Unknown resource" }, { status: 404 });
  } catch (e) {
    return err(e);
  }
}
export async function POST(request: Request, context: Context) {
  try {
    migrateLegacy();
    const { slug, resource } = await context.params,
      c = client(slug),
      repo = forClient(c),
      op = resource[0];
    if (op === "upload") {
      const form = await request.formData(),
        file = form.get("file");
      if (!(file instanceof File)) throw new Error("Choose a file");
      const asset = await upload(
        c,
        file,
        form.get("alcohol") === "true",
        form.get("consent") === "true",
        form.get("kind") === "graphic" ? "graphic" : "photo",
      );
      return NextResponse.json({ asset });
    }
    const body = await request.json();
    let result: unknown;
    switch (op) {
      case "profile":
        result = updateClient(c, body);
        break;
      case "content":
        result = repo.save(body, resource[1]);
        break;
      case "reject":
        repo.reject(z.string().parse(body.id));
        result = { ok: true };
        break;
      case "approve":
        result = approve(
          c,
          z.string().parse(body.id),
          "operator",
          z.string().parse(body.hash),
        );
        break;
      case "review-link": {
        const token = reviewLink(c, z.string().parse(body.id));
        const base = process.env.REVIEW_BASE_URL || new URL(request.url).origin;
        result = {
          url: `${base}/r/${token}`,
          localOnly: !process.env.REVIEW_BASE_URL,
        };
        break;
      }
      case "publish":
        result = await publish(
          c,
          z.string().parse(body.id),
          z.string().parse(body.hash),
          z.string().datetime({ offset: true }).optional().parse(body.when),
        );
        break;
      case "sync":
        await sync(c);
        result = { ok: true };
        break;
      case "generate":
        result = enqueue(c, "generate", {
          brief: z.string().trim().min(5).max(10000).parse(body.brief),
        });
        break;
      case "media":
        result = enqueue(
          c,
          "media",
          z
            .object({
              mode: z.enum(["image", "video"]),
              prompt: z.string().min(5).max(4000),
              sourceId: z.string().optional(),
              draftId: z.string().optional(),
              replaceAssetId: z.string().optional(),
            })
            .parse(body),
        );
        break;
      case "graphic":
        result = await graphic(
          c,
          z.string().parse(body.sourceId),
          z.string().max(80).parse(body.headline),
          body.story === true,
        );
        break;
      case "credential":
        saveCredential(
          c,
          providerSchema.parse(body.provider),
          z.string().parse(body.key),
        );
        result = { ok: true };
        break;
      case "test":
        result = await testConnection(c, providerSchema.parse(body.provider));
        break;
      case "accounts":
        result = await discover(
          c,
          z.enum(["typefully", "zernio"]).parse(body.provider),
        );
        break;
      case "bind":
        await bind(
          c,
          z.enum(["typefully", "zernio"]).parse(body.provider),
          platformSchema.parse(body.platform),
          z.string().parse(body.accountId),
        );
        result = { ok: true };
        break;
      case "connect":
        result = await connectURL(
          c,
          z.enum(["instagram", "facebook"]).parse(body.platform),
        );
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    return err(e);
  }
}
