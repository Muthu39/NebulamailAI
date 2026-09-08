import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { getGmailClient, getMessage } from "@/lib/gmail/client";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  try {
    const gmail = getGmailClient(session);
    return NextResponse.json({ email: await getMessage(gmail, (await params).id) });
  } catch {
    return NextResponse.json({ error: "MESSAGE_UNAVAILABLE" }, { status: 502 });
  }
}
