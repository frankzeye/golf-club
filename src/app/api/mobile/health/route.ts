import { NextResponse } from "next/server";

/** GET /api/mobile/health - quick connectivity check for mobile clients */
export async function GET() {
  return NextResponse.json({ ok: true });
}
