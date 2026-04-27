/**
 * Session helpers.
 *
 * The customer JWT lives in an httpOnly cookie. Pages and server actions
 * access the WMS via the factories below — they read the cookie and build
 * an appropriately-authed client.
 */

import { cookies } from "next/headers";
import { wmsClient } from "./client";

const SESSION_COOKIE =
  process.env.SESSION_COOKIE_NAME || "storefront_session";
const JWT_MAX_AGE_SECONDS = 7 * 24 * 60 * 60; // 7 days — matches WMS

// ──────────────────────────────────────────────────────────────────────────
// Session cookie
// ──────────────────────────────────────────────────────────────────────────

export async function getSessionToken(): Promise<string | null> {
  const c = await cookies();
  return c.get(SESSION_COOKIE)?.value ?? null;
}

export async function setSessionToken(token: string): Promise<void> {
  const c = await cookies();
  c.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: JWT_MAX_AGE_SECONDS,
  });
}

export async function clearSessionToken(): Promise<void> {
  const c = await cookies();
  c.delete(SESSION_COOKIE);
}

/**
 * Cheap auth check — just looks for a cookie, doesn't hit the WMS. An
 * expired token will pass this check but fail downstream calls. Use for
 * gating display (show/hide prices, swap UI) where an occasional false
 * positive is fine.
 */
export async function isLoggedIn(): Promise<boolean> {
  const token = await getSessionToken();
  return !!token;
}

// ──────────────────────────────────────────────────────────────────────────
// Client factories
// ──────────────────────────────────────────────────────────────────────────

/** Unauthenticated WMS client — catalog reads, login, invite flows. */
export function getClient() {
  return wmsClient(null);
}

/** Customer-authenticated WMS client. Throws if no session. */
export async function getAuthedClient() {
  const token = await getSessionToken();
  if (!token) throw new Error("Not authenticated");
  return wmsClient(token);
}

/** Safe variant — returns null instead of throwing when unauthenticated. */
export async function tryGetAuthedClient() {
  const token = await getSessionToken();
  if (!token) return null;
  return wmsClient(token);
}
