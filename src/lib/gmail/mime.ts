export function decodeBase64Url(value = "") {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf8");
}

export function getHeader(headers: Array<{ name?: string | null; value?: string | null }> = [], name: string) {
  return headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())?.value ?? "";
}

type MimePart = { mimeType?: string | null; body?: { data?: string | null } | null; parts?: MimePart[] };

export function extractBody(payload?: MimePart) {
  if (!payload) return { text: "", html: "" };
  const parts: MimePart[] = [];
  const visit = (part: MimePart) => { parts.push(part); part.parts?.forEach(visit); };
  visit(payload);
  const plain = parts.find((part) => part.mimeType === "text/plain" && part.body?.data)?.body?.data;
  const html = parts.find((part) => part.mimeType === "text/html" && part.body?.data)?.body?.data;
  const direct = payload.body?.data;
  return {
    text: decodeBase64Url(plain ?? direct ?? ""),
    html: decodeBase64Url(html ?? ""),
  };
}
