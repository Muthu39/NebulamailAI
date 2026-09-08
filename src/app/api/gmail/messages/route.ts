import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getGoogleOAuthConfig } from "@/lib/auth/google";
import { getGmailClient, listMessages } from "@/lib/gmail/client";
import { emptyFilters } from "@/types/mail";

const querySchema = z.object({ view: z.enum(["inbox", "sent"]).default("inbox"), sender: z.string().default(""), keyword: z.string().default(""), after: z.string().default(""), before: z.string().default(""), unread: z.coerce.boolean().default(false), search: z.string().default(""), pageToken: z.string().optional() });

export async function GET(request: Request) {
  try {
    getGoogleOAuthConfig(request.url);
  } catch (error) {
    if (error instanceof Error && error.message === "GOOGLE_OAUTH_NOT_CONFIGURED") {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }
    throw error;
  }
  const session = await getSession();
  if (!session?.accessToken) return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
  const params = querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const filters = { ...emptyFilters, sender: params.sender, keyword: params.keyword, after: params.after, before: params.before, unread: params.unread };
  try {
    const gmail = getGmailClient(session);
    const result = await listMessages(gmail, [params.view === "sent" ? "SENT" : "INBOX"], filters, params.search, params.pageToken);
    return NextResponse.json({ ...result, userEmail: session.email, profile: session.profile });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    console.error("Gmail message list failed", { code });
    if (code === "GOOGLE_OAUTH_NOT_CONFIGURED") return NextResponse.json({ error: code }, { status: 503 });
    if (code === "GOOGLE_TOKEN_MISSING") return NextResponse.json({ error: "AUTH_REQUIRED" }, { status: 401 });
    return NextResponse.json({ error: "GMAIL_UNAVAILABLE" }, { status: 502 });
  }
}
