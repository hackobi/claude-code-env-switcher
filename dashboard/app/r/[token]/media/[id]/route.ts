import fs from "node:fs";
import { resolveReview } from "../../../../../engine/approvals";
import { forClient } from "../../../../../engine/repository";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string; id: string }> },
) {
  try {
    const { token, id } = await params,
      { client, draft } = resolveReview(token);
    if (!draft.assetIds.includes(id))
      throw new Error("Media not included in this review");
    const a = forClient(client).asset(id);
    return new Response(new Uint8Array(fs.readFileSync(a.path)), {
      headers: {
        "Content-Type": a.mime,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
