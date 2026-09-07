export function getGoogleOAuthConfig(requestUrl: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error("GOOGLE_OAUTH_NOT_CONFIGURED");

  const configuredRedirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  const redirectUri = configuredRedirectUri || new URL("/api/auth/callback", requestUrl).toString();
  return { clientId, clientSecret, redirectUri };
}