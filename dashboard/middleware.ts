import { NextRequest, NextResponse } from "next/server";
export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/r/")) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
    return response;
  }
  if (path.startsWith("/_next/") || path.startsWith("/assets/"))
    return NextResponse.next();
  const host = req.headers.get("host")?.split(":")[0];
  if (!["127.0.0.1", "localhost"].includes(host || ""))
    return new NextResponse(
      "Operator workspace is available on localhost only",
      { status: 403 },
    );
  if (
    path.startsWith("/api/") &&
    !path.startsWith("/api/c/") &&
    path !== "/api/clients"
  )
    return NextResponse.json(
      { error: "Use a client-scoped endpoint" },
      { status: 410 },
    );
  if (!["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    const origin = req.headers.get("origin");
    if (!origin || new URL(origin).host !== req.headers.get("host"))
      return new NextResponse("Same-origin request required", { status: 403 });
  }
  return NextResponse.next();
}
export const config = { matcher: ["/((?!favicon.ico).*)"] };
