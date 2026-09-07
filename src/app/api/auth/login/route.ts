import { google } from "googleapis";
import { NextResponse } from "next/server";
import { getGoogleOAuthConfig } from "@/lib/auth/google";

export async function GET(request: Request) {
  try {
    const { clientId, clientSecret, redirectUri } = getGoogleOAuthConfig(request.url);
    const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
    const url = client.generateAuthUrl({ access_type: "offline", prompt: "select_account consent", scope: ["https://www.googleapis.com/auth/gmail.modify", "https://www.googleapis.com/auth/gmail.send", "https://www.googleapis.com/auth/userinfo.email", "https://www.googleapis.com/auth/userinfo.profile"] });
    return NextResponse.redirect(url);
  } catch (error) {
    if (error instanceof Error && error.message !== "GOOGLE_OAUTH_NOT_CONFIGURED") console.error("Google OAuth login setup failed", error);
    const redirectUrl = new URL("/?error=google_oauth_not_configured", request.url);
    return NextResponse.redirect(redirectUrl);
  }
}
