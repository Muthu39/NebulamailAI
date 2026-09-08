import { google } from "googleapis";
import type { gmail_v1 } from "googleapis";
import { extractBody, getHeader } from "@/lib/gmail/mime";
import type { MailDetail, MailFilter, MailSummary } from "@/types/mail";

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");
  const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
  return client;
}

export function getGmailClient(tokens?: { access_token?: string; refresh_token?: string; accessToken?: string; refreshToken?: string }) {
  const auth = getOAuthClient();
  const accessToken = tokens?.access_token ?? tokens?.accessToken;
  const refreshToken = tokens?.refresh_token ?? tokens?.refreshToken;
  if (!accessToken && !refreshToken) throw new Error("GOOGLE_TOKEN_MISSING");
  auth.setCredentials({ access_token: accessToken, refresh_token: refreshToken });
  return google.gmail({ version: "v1", auth });
}

function toSummary(message: gmail_v1.Schema$Message): MailSummary {
  const headers = message.payload?.headers ?? [];
  const from = getHeader(headers, "From");
  const senderMatch = from.match(/^(.*?)\s*<(.+)>$/);
  const sender = senderMatch?.[1]?.replaceAll('"', "").trim() || from || "Unknown sender";
  const senderEmail = senderMatch?.[2] || from;
  const timestamp = Number(message.internalDate ?? Date.now());
  return {
    id: message.id ?? "",
    threadId: message.threadId ?? "",
    sender,
    senderEmail,
    subject: getHeader(headers, "Subject") || "(no subject)",
    preview: message.snippet ?? "",
    date: new Date(timestamp).toISOString(),
    timestamp,
    isUnread: message.labelIds?.includes("UNREAD") ?? false,
    labelIds: message.labelIds ?? [],
  };
}

export function buildGmailQuery(filters: MailFilter, searchQuery = "") {
  const pieces = [searchQuery.trim(), filters.sender && `from:${filters.sender.trim()}`, filters.keyword.trim(), filters.after && `after:${filters.after}`, filters.before && `before:${filters.before}`, filters.unread && "is:unread"].filter(Boolean);
  return pieces.join(" ");
}

export async function listMessages(gmail: gmail_v1.Gmail, labelIds: string[], filters: MailFilter, searchQuery: string, pageToken?: string) {
  const response = await gmail.users.messages.list({ userId: "me", labelIds, q: buildGmailQuery(filters, searchQuery), maxResults: 100, pageToken: pageToken || undefined });
  const messages = response.data.messages ?? [];
  const results = await Promise.allSettled(messages.map(async ({ id }) => {
    if (!id) return undefined;
    const response = await gmail.users.messages.get({ userId: "me", id, format: "metadata", metadataHeaders: ["From", "Subject"] });
    return toSummary(response.data);
  }));
  const emails = results.flatMap((result) => result.status === "fulfilled" && result.value ? [result.value] : []);
  return { emails, nextPageToken: response.data.nextPageToken ?? undefined };
}

export async function getMessage(gmail: gmail_v1.Gmail, id: string): Promise<MailDetail> {
  const response = await gmail.users.messages.get({ userId: "me", id, format: "full" });
  const message = response.data;
  const summary = toSummary(message);
  const headers = message.payload?.headers ?? [];
  const body = extractBody(message.payload);
  await gmail.users.messages.modify({ userId: "me", id, requestBody: { removeLabelIds: ["UNREAD"] } });
  return { ...summary, to: getHeader(headers, "To"), bodyText: body.text || message.snippet || "", bodyHtml: body.html, replyTo: getHeader(headers, "Reply-To") || summary.senderEmail };
}

export async function sendMessage(gmail: gmail_v1.Gmail, input: { to: string; subject: string; body: string; threadId?: string; inReplyTo?: string }) {
  const headers = [`To: ${input.to}`, `Subject: ${input.subject}`, "Content-Type: text/plain; charset=UTF-8", ...(input.inReplyTo ? [`In-Reply-To: ${input.inReplyTo}`, `References: ${input.inReplyTo}`] : [])];
  const raw = [...headers, "", input.body].join("\r\n");
  const encoded = Buffer.from(raw).toString("base64url");
  return gmail.users.messages.send({ userId: "me", requestBody: { raw: encoded, threadId: input.threadId } });
}

export async function createWatch(gmail: gmail_v1.Gmail) {
  const topicName = process.env.GMAIL_PUBSUB_TOPIC;
  if (!topicName) throw new Error("GMAIL_PUBSUB_TOPIC is not configured");
  return gmail.users.watch({ userId: "me", requestBody: { topicName, labelIds: ["INBOX"] } });
}
