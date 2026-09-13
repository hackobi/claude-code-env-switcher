import { NextResponse } from "next/server";
import { decideReview } from "../../../../engine/approvals";
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || new URL(origin).host !== request.headers.get("host"))
      throw new Error("Same-origin request required");
    const { token } = await params;
    const body = await request.json();
    decideReview(token, body.decision);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
