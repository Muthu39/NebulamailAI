import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { createWatch, getGmailClient } from "@/lib/gmail/client";

export async function POST() {
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  try {
    const response = await createWatch(getGmailClient(session));
    return NextResponse.json({ ok: true, historyId: response.data.historyId, expiration: response.data.expiration });
  } catch {
    return NextResponse.json({ error: "WATCH_FAILED" }, { status: 502 });
  }
}
