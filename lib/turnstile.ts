
/**
 * Turnstile server-side verification.
 *
 * The widget's token proves nothing until Cloudflare confirms it. A bot can
 * post any string to a server action; only siteverify can tell.
 *
 * Missing configuration fails closed in deployed environments.
 * Local development may explicitly opt out using TURNSTILE_ALLOW_LOCAL_BYPASS.
 *
 * Tokens are single-use and last about five minutes. A rejected token is
 * therefore permanently rejected — the client must reset the widget before
 * retrying, not resend the same value.
 */

const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  ok: boolean;
  /** Present when refused — for logs, never for the customer. */
  reason?: string;
}

export async function verifyTurnstile(
  token: string | null | undefined,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    if (process.env.NODE_ENV === 'development' && !process.env.VERCEL && process.env.TURNSTILE_ALLOW_LOCAL_BYPASS === 'true') {
      console.warn('[turnstile] explicit local development bypass enabled');
      return { ok: true };
    }
    console.error('[turnstile] missing server configuration');
    return { ok: false, reason: 'missing-secret' };
  }

  if (!token) {
    return { ok: false, reason: "missing-token" };
  }

  try {
    // remoteip is optional. Do not trust client-supplied forwarding headers.
    const body = new URLSearchParams({ secret, response: token });

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!res.ok) {
      // Cloudflare itself is unreachable or erroring. Refuse rather than wave
      // it through: an attacker who can break siteverify would otherwise have
      // found the way past it.
      console.error("[turnstile] siteverify HTTP", res.status);
      return { ok: false, reason: `siteverify-http-${res.status}` };
    }

    const data = (await res.json()) as {
      success: boolean;
      "error-codes"?: string[];
    };

    if (!data.success) {
      return {
        ok: false,
        reason: (data["error-codes"] ?? ["unknown"]).join(","),
      };
    }

    return { ok: true };
  } catch (err) {
    console.error("[turnstile] verify threw", err);
    return { ok: false, reason: "verify-threw" };
  }
}
