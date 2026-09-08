import { NextResponse } from "next/server";
import { publishMailUpdate } from "@/lib/sync/events";

export async function POST(request: Request) {
  const expected = process.env.GMAIL_WEBHOOK_SECRET;
  const received = request.headers.get("x-nebula-webhook-secret");
  if (!expected || received !== expected) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const payload = await request.json().catch(() => null);
  if (!payload?.message?.data) return NextResponse.json({ ok: true });
  publishMailUpdate();
  return NextResponse.json({ ok: true });
}
