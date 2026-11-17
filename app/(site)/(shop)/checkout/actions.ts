"use server";

/**
 * Checkout submit.
 *
 * Runs on the server for one non-negotiable reason: WMS_API_KEY identifies the
 * store to the WMS and must never reach the browser. The client's job stops at
 * turning a card into a nonce.
 *
 * Nothing here trusts the client's numbers. Prices, line totals and the order
 * total are computed by WMS using the invited customer's wholesale pricing; the
 * items array carries only variantId and quantity, so a tampered cart buys
 * nothing at the wrong price.
 */

import { headers } from "next/headers";
import { vprFreeShipping } from "@/lib/wholesale-checkout";
import { getSessionToken } from "@/lib/wms/session";
import { wmsClient, WmsError } from "@/lib/wms/client";
import { sendOrderConfirmationEmail } from "@/lib/email";
import { verifyTurnstile } from "@/lib/turnstile";
import type { OpaqueData, ShippingAddress } from "@/lib/wms/types";

export interface CheckoutInput {
  idempotencyKey: string;
  expectedTotalCents: number;
  email: string;
  items: Array<{ variantId: string; quantity: number }>;
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  opaqueData: OpaqueData;
  /** Cloudflare Turnstile token from the widget on the checkout form. */
  turnstileToken?: string | null;
  /**
   * Cosmetic only — variantId → display name, taken from the browser cart so
   * the receipt reads "Skwezed Salt Watermelon" instead of a SKU. Never used
   * for money: quantities and amounts come from the WMS's own response.
   */
  displayNames?: Record<string, string>;
}

export type CheckoutResult =
  | { ok: true; orderNumber: string; token: string | null }
  | { ok: false; code: CheckoutErrorCode; message: string };

export type CheckoutErrorCode =
  | "auth"
  | "pending"
  | "declined"
  | "unavailable"
  | "invalid"
  | "challenge"
  | "unknown";

export async function placeOrderAction(
  input: CheckoutInput,
): Promise<CheckoutResult> {
  if (!/^[A-Za-z0-9_-]{8,128}$/.test(input.idempotencyKey ?? '') || !Number.isSafeInteger(input.expectedTotalCents) || input.expectedTotalCents < 0) {
    return { ok: false, code: 'invalid', message: 'Refresh checkout to confirm your order total.' };
  }
  const token = await getSessionToken();
  if (!token) return { ok: false, code: 'auth', message: 'Sign in with your invited wholesale account before ordering.' };
  if (!/^[A-Z]{2}$/.test((input.shippingAddress?.country ?? 'US').trim().toUpperCase())) return {ok: false, code: 'invalid', message: 'Use a two-letter shipping country code.'};
  if (!input.items?.length) {
    return { ok: false, code: "invalid", message: "Your cart is empty." };
  }

  // Bot check BEFORE the gateway. Ordering matters: everything past this point
  // costs a real Authorize.net call, and card-testing is precisely the traffic
  // this endpoint attracts.
  const challenge = await verifyTurnstile(input.turnstileToken);
  if (!challenge.ok) {
    console.warn(`[checkout] turnstile refused: ${challenge.reason}`);
    return {
      ok: false,
      code: "challenge",
      message:
        "We couldn't verify that you're human. Please try again — refresh the page if it keeps happening.",
    };
  }

  const client = wmsClient(token);
  let paymentSubmitted = false;
  try {
    const { store } = await client.getStore();
    if (store.mode !== 'WHOLESALE' || !process.env.WMS_STORE_ID || store.id !== process.env.WMS_STORE_ID || !store.shippingRatesSupported) {
      return {ok: false, code: 'unavailable', message: 'Wholesale checkout is temporarily unavailable. Please contact your sales rep.'};
    }
    const { customer } = await client.getMe();
    if (!customer.wholesaleAccount) return {ok: false, code: 'auth', message: 'Your account needs wholesale access. Contact your sales rep.'};
    paymentSubmitted = true;
    const { order } = await client.placeOrder({
      idempotencyKey: input.idempotencyKey,
      expectedTotalCents: input.expectedTotalCents,
      shipping: vprFreeShipping(input.expectedTotalCents),
      items: input.items,
      shippingAddress: input.shippingAddress,
      billingAddress: input.billingAddress,
      email: customer.email,
      payment: { opaqueData: input.opaqueData },
    });

    // Receipt. Non-blocking and deliberately after the order exists: the money
    // is already authorized, so a dead mail provider must not turn a placed
    // order into an error the customer will retry — and a retry would mean a
    // second card charge.
    if (order.guestAccessToken) {
      try {
        const h = await headers();
        const host = h.get("host");
        const proto = h.get("x-forwarded-proto") ?? "https";
        // Derived from the request rather than an env var so this works on a
        // cloudflared tunnel and in production without extra configuration.
        const base = process.env.NEXT_PUBLIC_SITE_URL ?? `${proto}://${host}`;

        // Catalog lookup failures must never undo a confirmed order or prevent its receipt.
        const details = await Promise.allSettled(order.items.map(async item => {
          if (!item.productVariantId) return null;
          const { product } = await client.getProduct(item.productVariantId);
          return product;
        }));

        await sendOrderConfirmationEmail({
          orderId: order.id,
          orderNumber: order.orderNumber,
          to: customer.email,
          totalAmount: order.totalAmount,
          statusUrl: `${base}/orders/${order.guestAccessToken}`,
          items: order.items.map((item, index) => {
            const result = details[index];
            const product = result.status === 'fulfilled' ? result.value : null;
            return {
              name: product?.name || (item.productVariantId && input.displayNames?.[item.productVariantId]) || item.sku,
              variantName: product?.variantName,
              imageUrl: product?.imageUrl,
              quantity: item.quantity,
              totalPrice: item.totalPrice,
            };
          }),
        });
      } catch (err) {
        console.error("[checkout] confirmation email failed", err);
      }
    }

    return {
      ok: true,
      orderNumber: order.orderNumber,
      token: order.guestAccessToken,
    };
  } catch (err) {
    if (err instanceof WmsError) {
      const body = err.body as
        | { error?: string; message?: string; missingVariantIds?: string[]; code?: string }
        | null;

      if (body?.code === 'PAYMENT_PENDING' || body?.code === 'IDEMPOTENCY_CONFLICT') {
        return {ok: false, code: 'pending', message: 'Your payment needs confirmation. Do not submit another payment. Check your order history or contact us with your checkout reference.'};
      }
      if (body?.code === 'PAYMENT_SETUP') return {ok: false, code: 'unavailable', message: 'Card payments are temporarily unavailable. Please contact your sales rep.'};
      if (!paymentSubmitted && [401,403].includes(err.status)) return {ok: false, code: 'auth', message: 'Sign in with your invited wholesale account before ordering.'};
      if (err.status === 409) return {ok: false, code: 'invalid', message: 'Prices or availability changed. Refresh your cart to review the total before paying.'};
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

    console.error('[checkout] placeOrder failed', {attempt: input.idempotencyKey, error: err instanceof Error ? err.name : 'unknown'});
    return paymentSubmitted
      ? {ok: false, code: 'pending', message: "We couldn't confirm your payment outcome. Do not submit another payment. Check your order history or contact us with your checkout reference."}
      : {ok: false, code: 'unavailable', message: 'Checkout is temporarily unavailable. Please try again later.'};
  }
}
