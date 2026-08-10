"use server";

/**
 * Checkout submit.
 *
 * Runs on the server for one non-negotiable reason: WMS_API_KEY identifies the
 * store to the WMS and must never reach the browser. The client's job stops at
 * turning a card into a nonce.
 *
 * Nothing here trusts the client's numbers. Prices, line totals and the order
 * total are all computed by the WMS from ProductVariant.sellingPrice — the
 * items array carries only variantId and quantity, so a tampered cart buys
 * nothing at the wrong price.
 */

import { getClient } from "@/lib/wms/session";
import { getSessionToken } from "@/lib/wms/session";
import { wmsClient, WmsError } from "@/lib/wms/client";
import type { OpaqueData, ShippingAddress } from "@/lib/wms/types";

export interface CheckoutInput {
  email: string;
  items: Array<{ variantId: string; quantity: number }>;
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  opaqueData: OpaqueData;
}

export type CheckoutResult =
  | { ok: true; orderNumber: string; token: string | null }
  | { ok: false; code: CheckoutErrorCode; message: string };

export type CheckoutErrorCode =
  | "declined"
  | "unavailable"
  | "invalid"
  | "unknown";

export async function placeOrderAction(
  input: CheckoutInput,
): Promise<CheckoutResult> {
  if (!input.items?.length) {
    return { ok: false, code: "invalid", message: "Your cart is empty." };
  }

  // A signed-in customer's token makes the WMS use THEIR email and attach the
  // order to their account; a guest sends the email in the body. Same endpoint
  // either way — storefrontCustomerOptional never rejects.
  const token = await getSessionToken();
  const client = token ? wmsClient(token) : getClient();

  try {
    const { order } = await client.placeOrder({
      items: input.items,
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
      email: input.email,
      payment: { opaqueData: input.opaqueData },
    });

    return {
      ok: true,
      orderNumber: order.orderNumber,
      token: order.guestAccessToken,
    };
  } catch (err) {
    if (err instanceof WmsError) {
      const body = err.body as
        | { error?: string; message?: string; missingVariantIds?: string[] }
        | null;

      // 402 covers both a real decline and a spent/expired nonce. The customer
      // can't tell those apart and shouldn't have to — either way the fix is
      // to re-enter the card, and the WMS has already deleted the order, so
      // there is nothing half-finished to clean up.
      if (err.status === 402) {
        return {
          ok: false,
          code: "declined",
          message:
            body?.message ??
            "That payment was declined. Check the card details and try again.",
        };
      }

      // Something in the cart is no longer sellable through this store.
      if (err.status === 400 && body?.missingVariantIds?.length) {
        return {
          ok: false,
          code: "unavailable",
          message:
            "Some items are no longer available. Please review your cart.",
        };
      }

      if (err.status === 400) {
        return {
          ok: false,
          code: "invalid",
          message: body?.error ?? "Please check the details and try again.",
        };
      }
    }

    // Anything else — gateway threw, WMS down, network. The WMS rolls the
    // order back on a thrown authorization, so a retry is safe. Log server-side
    // where the detail is useful; the customer gets something actionable.
    console.error("[checkout] placeOrder failed", err);
    return {
      ok: false,
      code: "unknown",
      message:
        "We couldn't complete your order. No payment was taken — please try again.",
    };
  }
}
