"use server";

/**
 * Order lookup — the fallback for a customer who lost the emailed link.
 *
 * The WMS deliberately answers an unknown order number and a wrong email
 * IDENTICALLY: same 404, same shape, and a minimum response time so the two
 * can't be told apart by timing either. That is the whole defence against
 * someone walking order numbers to discover which ones exist.
 *
 * So this action must never explain WHICH half was wrong. One message for
 * every failure, however tempting a more helpful one looks.
 */

import { getClient } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";
import type { OrderStatus } from "@/lib/wms/types";

export type LookupResult =
  | { ok: true; order: OrderStatus }
  | { ok: false; message: string };

const NOT_FOUND =
  "We couldn't find an order with that number and email. Check both and try again.";

export async function lookupOrderAction(
  orderNumber: string,
  email: string,
): Promise<LookupResult> {
  const trimmedNumber = orderNumber.trim().toUpperCase();
  const trimmedEmail = email.trim();

  if (!trimmedNumber || !trimmedEmail) {
    return { ok: false, message: "Enter both your order number and email." };
  }

  try {
    const { order } = await getClient().lookupOrder({
      orderNumber: trimmedNumber,
      email: trimmedEmail,
    });
    return { ok: true, order };
  } catch (err) {
    if (err instanceof WmsError) {
      // 5 per minute per IP, enforced by the WMS. Worth saying plainly —
      // it's the one failure where trying again immediately won't help.
      if (err.status === 429) {
        return {
          ok: false,
          message: "Too many attempts. Please wait a minute and try again.",
        };
      }
      // 404 covers unknown order, wrong email, and a malformed number alike.
      if (err.status === 404 || err.status === 400) {
        return { ok: false, message: NOT_FOUND };
      }
    }

    console.error("[lookup] failed", err);
    return {
      ok: false,
      message: "Something went wrong looking that up. Please try again.",
    };
  }
}
