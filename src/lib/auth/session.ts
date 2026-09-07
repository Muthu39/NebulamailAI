import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";

export type Session = { accessToken: string; refreshToken?: string; email?: string; profile?: { name?: string; picture?: string } };
const cookieName = "nebula_session";

function secret() {
  const value = process.env.NEXTAUTH_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("NEXTAUTH_SECRET is required in production");
  return createHash("sha256").update(value || "local-development-secret-change-me").digest();
}

export async function setSession(session: Session) {
  const token = await new EncryptJWT(session).setProtectedHeader({ alg: "dir", enc: "A256GCM" }).setIssuedAt().setExpirationTime("7d").encrypt(secret());
  (await cookies()).set(cookieName, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
}

export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtDecrypt(token, secret());
    if (typeof payload.accessToken !== "string") return null;
    return { accessToken: payload.accessToken, refreshToken: typeof payload.refreshToken === "string" ? payload.refreshToken : undefined, email: typeof payload.email === "string" ? payload.email : undefined, profile: typeof payload.profile === "object" && payload.profile ? payload.profile as Session["profile"] : undefined };
  } catch {
    return null;
  }
}

export async function clearSession() {
  (await cookies()).delete(cookieName);
}
