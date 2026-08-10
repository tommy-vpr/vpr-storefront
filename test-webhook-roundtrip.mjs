// test-webhook-roundtrip.mjs
//
// Fires a correctly-signed storefront event at the webhook receiver, proving
// the WMS's signPayload and the receiver's verify() agree byte-for-byte over
// the real wire format. This is the one integration the two-sides-look-right
// code review can't establish on its own.
//
// It reproduces exactly what apps/worker/src/processors/storefront.processor.ts
// sends:
//   body      = JSON.stringify(payload)
//   signature = "sha256=" + hmacSHA256(`${timestamp}.${body}`, secret)
//   headers   = Content-Type: application/json
//               x-wms-signature, x-wms-timestamp, x-wms-event-id
//
// RUN (Node 18+, no deps):
//   WMS_WEBHOOK_SECRET=<the same secret the receiver has> \
//   node test-webhook-roundtrip.mjs [receiverUrl]
//
//   receiverUrl defaults to http://localhost:3002/api/webhooks/wms
//
// The secret MUST equal what the receiver reads from its own
// WMS_WEBHOOK_SECRET env, or you'll (correctly) get a 401 bad_signature —
// which itself proves verification is live.

import { createHmac } from "node:crypto";

const URL = process.argv[2] || "http://localhost:3002/api/webhooks/wms";
const SECRET = process.env.WMS_WEBHOOK_SECRET;

if (!SECRET) {
  console.error("Set WMS_WEBHOOK_SECRET to the receiver's secret.");
  process.exit(1);
}

// Must match the WMS signer exactly: `${timestamp}.${body}`.
function signPayload(body, secret, timestamp) {
  const mac = createHmac("sha256", secret);
  mac.update(`${timestamp}.${body}`);
  return `sha256=${mac.digest("hex")}`;
}

const STORE_ID = process.env.WMS_STORE_ID || "test-store-id";

// A realistic order.shipped envelope. The receiver's Envelope/OrderEventData
// shape drives these fields.
function makeEnvelope(eventType, extra = {}) {
  const orderId = "test_order_" + Date.now();
  return {
    eventId: `${eventType}:${orderId}`,
    eventType,
    emittedAt: new Date().toISOString(),
    storeId: STORE_ID,
    data: {
      orderId,
      orderNumber: "SF-TEST-000001",
      status: "SHIPPED",
      customerEmail: null, // null so it won't actually send an email during the test
      ...extra,
    },
  };
}

async function fire(label, envelope, { tamper = false } = {}) {
  const body = JSON.stringify(envelope);
  const timestamp = Math.floor(Date.now() / 1000);
  let signature = signPayload(body, SECRET, timestamp);
  if (tamper) signature = signature.slice(0, -2) + "00"; // corrupt last byte

  const res = await fetch(URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wms-signature": signature,
      "x-wms-timestamp": String(timestamp),
      "x-wms-event-id": envelope.eventId,
    },
    body,
  });

  const text = await res.text();
  console.log(`\n${label}`);
  console.log(`  → ${res.status} ${text}`);
  return { status: res.status, text };
}

async function main() {
  console.log(`Receiver: ${URL}`);
  console.log(`Store id: ${STORE_ID}`);

  // 1. Valid shipped event → expect 200 { received: true }
  const shipped = makeEnvelope("order.shipped", {
    shipment: {
      trackingNumber: "9400100000000000000000",
      carrier: "stamps_com",
      trackingUrl: "https://tools.usps.com/go/TrackConfirmAction?tLabels=9400100000000000000000",
      shippedAt: new Date().toISOString(),
    },
  });
  const a = await fire("1. valid order.shipped", shipped);

  // 2. REPLAY the same event → expect 200 { duplicate: true } (idempotency)
  const b = await fire("2. replay same eventId (idempotency)", shipped);

  // 3. Tampered signature → expect 401 bad_signature (verification is live)
  const c = await fire("3. tampered signature", makeEnvelope("order.shipped"), {
    tamper: true,
  });

  // 4. Stale timestamp → expect 401 stale_timestamp (replay window)
  //    Build one by hand with an old timestamp.
  {
    const env = makeEnvelope("order.shipped");
    const body = JSON.stringify(env);
    const oldTs = Math.floor(Date.now() / 1000) - 3600; // 1h ago
    const sig = signPayload(body, SECRET, oldTs);
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-wms-signature": sig,
        "x-wms-timestamp": String(oldTs),
        "x-wms-event-id": env.eventId,
      },
      body,
    });
    console.log(`\n4. stale timestamp (1h old)`);
    console.log(`  → ${res.status} ${await res.text()}`);
  }

  // ── verdict ────────────────────────────────────────────────────────────
  console.log("\n" + "─".repeat(60));
  const ok =
    a.status === 200 &&
    b.status === 200 &&
    b.text.includes("duplicate") &&
    c.status === 401;
  console.log(
    ok
      ? "✅ ROUND-TRIP VERIFIED: valid signature accepted, replay deduped, tamper rejected."
      : "❌ Something is off — inspect the statuses above against expectations:\n" +
          "   1 → 200 received, 2 → 200 duplicate, 3 → 401, 4 → 401 stale",
  );
  console.log("─".repeat(60));
}

main().catch((e) => {
  console.error("\nERROR:", e.message);
  console.error("Is the storefront dev server running on that URL?");
  process.exit(1);
});
