import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getGmailClient, sendMessage } from "@/lib/gmail/client";

const bodySchema = z.object({ to: z.string().email(), subject: z.string().max(998), body: z.string().min(1), threadId: z.string().optional(), inReplyTo: z.string().optional() });

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "INVALID_MESSAGE" }, { status: 400 });
  try {
    const gmail = getGmailClient(session);
    const result = await sendMessage(gmail, parsed.data);
    return NextResponse.json({ ok: true, id: result.data.id });
  } catch {
    return NextResponse.json({ error: "SEND_FAILED" }, { status: 502 });
  }
}
