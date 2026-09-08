import { google } from "googleapis";
import { NextResponse } from "next/server";
import { setSession } from "@/lib/auth/session";
import { getGoogleOAuthConfig } from "@/lib/auth/google";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/?error=oauth", request.url));
  try {
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(request.url);
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const { tokens } = await client.getToken(code);
    if (!tokens.access_token) throw new Error("GOOGLE_ACCESS_TOKEN_MISSING");
    client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: client });
    const profile = await oauth2.userinfo.get();
    await setSession({ accessToken: tokens.access_token ?? "", refreshToken: tokens.refresh_token ?? undefined, email: profile.data.email ?? undefined, profile: { name: profile.data.name ?? undefined, picture: profile.data.picture ?? undefined } });
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Google OAuth callback failed", { code: error instanceof Error ? error.message : "UNKNOWN" });
    return NextResponse.redirect(new URL("/?error=oauth", request.url));
  }
}
