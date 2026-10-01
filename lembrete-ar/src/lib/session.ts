import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type Session = { userId: string; accountId: string; exp: number };
const COOKIE = "session";
const TTL = 60 * 60 * 24 * 30;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET ausente");
  return s || "dev-secret-change-me";
}

export function signSession(p: Omit<Session, "exp">): string {
  const body = Buffer.from(JSON.stringify({ ...p, exp: Math.floor(Date.now() / 1000) + TTL })).toString("base64url");
  const sig = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifySession(token?: string): Session | null {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = crypto.createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig), b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  const s = JSON.parse(Buffer.from(body, "base64url").toString()) as Session;
  return s.exp > Date.now() / 1000 ? s : null;
}

export const SESSION_COOKIE = { name: COOKIE, maxAge: TTL };

export function getSession(): Session | null {
  return verifySession(cookies().get(COOKIE)?.value);
}
export function requireSession(): Session {
  const s = getSession();
  if (!s) redirect("/login");
  return s;
}
