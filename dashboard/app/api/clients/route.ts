import { NextResponse } from "next/server";
import { clients, createClient } from "../../../engine/clients";
import { migrateLegacy } from "../../../engine/migrate";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    migrateLegacy();
    return NextResponse.json({ clients: clients() });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    migrateLegacy();
    return NextResponse.json(
      { client: createClient(await request.json()) },
      { status: 201 },
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
