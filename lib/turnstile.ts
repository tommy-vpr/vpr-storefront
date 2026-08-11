import { headers } from "next/headers";

/**
 * Turnstile server-side verification.
 *
 * The widget's token proves nothing until Cloudflare confirms it. A bot can
 * post any string to a server action; only siteverify can tell.
 *
 * FAIL-OPEN vs FAIL-CLOSED. This is the decision worth understanding:
 *
 *   - Secret NOT set  → allowed, with a loud warning on every checkout. That
 *     is a deliberate dev affordance so a local checkout works without a
 *     Cloudflare account. It is ALSO a hole if it ever reaches production
 *     unset, which is why the warning names the risk. Worth a boot assertion
 *     alongside the WMS_STORE_ID one.
 *   - Secret set, verification fails → REFUSED. Once the protection is
 *     configured, a failure is a failure.
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
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY not set — checkout is UNPROTECTED " +
        "against card-testing bots. Fine locally; a hole in production.",
    );
    return { ok: true };
  }

  if (!token) {
    return { ok: false, reason: "missing-token" };
  }

  try {
    const h = await headers();
    // Cloudflare's own header first — on this deployment it is the only one
    // that can't be spoofed by the client.
    const ip =
      h.get("cf-connecting-ip") ??
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      undefined;

    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
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
