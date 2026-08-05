import { createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { sendOrderShippedEmail, sendOrderCancelledEmail } from "@/lib/email";

/**
 * WMS → storefront webhook receiver.
 *
 * The WMS signs every event with HMAC-SHA256 over `${timestamp}.${body}` and
 * sends:
 *   x-wms-signature: sha256=<hex>
 *   x-wms-timestamp: <unix seconds>
 *   x-wms-event-id:  <event-type>:<order-id>
 *
 * Delivery is AT-LEAST-ONCE and UNORDERED. The WMS retries on any non-2xx,
 * so this route must be safe to call repeatedly with the same event.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // needs node:crypto — not edge-compatible

/** Reject anything older than this. Must match the WMS constant. */
const MAX_SKEW_SECONDS = 300;

function verify(
  body: string,
  secret: string,
  timestamp: number,
  signature: string,
): { valid: boolean; reason?: string } {
  if (!Number.isFinite(timestamp))
    return { valid: false, reason: "bad_timestamp" };

  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - timestamp) > MAX_SKEW_SECONDS) {
    return { valid: false, reason: "stale_timestamp" };
  }

  const mac = createHmac("sha256", secret);
  mac.update(`${timestamp}.${body}`);
  const expected = `sha256=${mac.digest("hex")}`;

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return { valid: false, reason: "bad_signature" };
  if (!timingSafeEqual(a, b)) return { valid: false, reason: "bad_signature" };

  return { valid: true };
}

/** Prisma's unique-constraint error, without importing the generated client. */
function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: unknown }).code === "P2002"
  );
}

interface OrderEventData {
  orderId: string;
  orderNumber: string;
  status: string;
  customerEmail: string | null;
  shipment?: {
    trackingNumber: string;
    carrier: string;
    trackingUrl: string;
    shippedAt: string;
  };
  reason?: string;
}

interface Envelope {
  eventId: string;
  eventType: string;
  emittedAt: string;
  storeId: string;
  data: OrderEventData;
}

export async function POST(request: Request) {
  const secret = process.env.WMS_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[wms-webhook] WMS_WEBHOOK_SECRET not set");
    // 500 so the WMS retries — this is our misconfiguration, not a bad request.
    return NextResponse.json({ error: "not_configured" }, { status: 500 });
  }

  // Read the RAW body. Signature is over the exact bytes sent; re-serializing
  // parsed JSON would reorder keys and break verification.
  const body = await request.text();

  const signature = request.headers.get("x-wms-signature");
  const timestampHeader = request.headers.get("x-wms-timestamp");
  const eventId = request.headers.get("x-wms-event-id");

  if (!signature || !timestampHeader) {
    return NextResponse.json({ error: "missing_signature" }, { status: 401 });
  }

  const result = verify(body, secret, Number(timestampHeader), signature);
  if (!result.valid) {
    console.warn(`[wms-webhook] rejected ${eventId ?? "?"}: ${result.reason}`);
    // 401 is a PERMANENT failure in the WMS processor — it won't retry, which
    // is right: an identical replay would fail identically.
    return NextResponse.json({ error: result.reason }, { status: 401 });
  }

  let envelope: Envelope;
  try {
    envelope = JSON.parse(body) as Envelope;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // ── Reject events meant for a different store ──────────────────────────
  if (envelope.storeId !== process.env.WMS_STORE_ID) {
    console.warn(`[wms-webhook] wrong store: ${envelope.storeId}`);
    return NextResponse.json({ error: "wrong_store" }, { status: 401 });
  }

  // ── Claim the event ───────────────────────────────────────────────────────
  // Insert BEFORE handling, so two concurrent deliveries of the same event
  // can't both proceed — the loser hits the primary key. Checking first and
  // inserting after would leave a window where both reads miss.
  try {
    await prisma.processedEvent.create({
      data: {
        eventId: envelope.eventId,
        eventType: envelope.eventType,
        orderId: envelope.data?.orderId ?? null,
      },
    });
  } catch (err) {
    // P2002 = unique constraint violation = we've already handled this event.
    // 200, not an error: the WMS did nothing wrong and should stop retrying.
    //
    // Checked by duck-typing rather than `instanceof
    // Prisma.PrismaClientKnownRequestError` so this file doesn't depend on the
    // generated client's runtime namespace — that import breaks typechecking
    // before `prisma generate` has run, e.g. on a fresh clone or in CI.
    if (isUniqueViolation(err)) {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error(`[wms-webhook] claim failed for ${envelope.eventId}:`, err);
    // Couldn't reach the DB — 500 so the WMS retries rather than dropping it.
    return NextResponse.json({ error: "claim_failed" }, { status: 500 });
  }

  // ── Handle ────────────────────────────────────────────────────────────────
  try {
    switch (envelope.eventType) {
      case "order.shipped":
        await sendOrderShippedEmail(envelope.eventId, envelope.data);
        break;

      case "order.cancelled":
        await sendOrderCancelledEmail(envelope.eventId, envelope.data);
        break;

      // Known but not yet handled. The claim stands — we received it and have
      // nothing to do with it, so a retry would change nothing.
      case "order.delivered":
      case "order.refunded":
        console.log(`[wms-webhook] ${envelope.eventType} received, no handler`);
        break;

      default:
        console.warn(`[wms-webhook] unknown event type: ${envelope.eventType}`);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(`[wms-webhook] handler failed for ${envelope.eventId}:`, err);

    // Release the claim so the WMS's retry can actually reprocess. Without
    // this, a transient email failure would be permanent: the event would be
    // marked handled and every retry deduped away.
    //
    // Small race: if a concurrent delivery is mid-handler when we delete, it
    // could process twice. Resend's idempotency key (also the eventId) is the
    // backstop for that, and it's the rarer harm — a duplicate email beats a
    // silently missing one.
    await prisma.processedEvent
      .delete({ where: { eventId: envelope.eventId } })
      .catch(() => {});

    return NextResponse.json({ error: "handler_failed" }, { status: 500 });
  }
}
