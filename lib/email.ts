import { Resend } from "resend";

/**
 * Transactional email for WMS order events.
 *
 * Dedupe is primarily handled by the `processed_events` table — the receiver
 * claims each eventId before calling in here, so a repeat delivery never
 * reaches this code.
 *
 * The `idempotencyKey` below is a SECOND layer, covering the one gap the claim
 * can't: if a handler fails partway, the receiver releases the claim so the
 * WMS can retry, and a concurrent delivery could briefly overlap. Resend holds
 * keys for 24 hours, which is far longer than the WMS retry window (6
 * attempts, exponential from 10s).
 *
 * IMPORTANT: Resend checks the PAYLOAD as well as the key. Same key with a
 * different body returns 409 rather than deduping. So nothing in these emails
 * may vary between retries — no "sent at" timestamps, no random ids, no
 * Date.now(). Every field must derive purely from the event data.
 */

/**
 * Lazily constructed.
 *
 * `new Resend(undefined)` THROWS rather than deferring — so constructing at
 * module scope breaks `next build`, which evaluates every route module while
 * collecting page data and has no runtime env. Creating it on first send keeps
 * the build green and still fails loudly at request time if the key is absent.
 */
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY);
  return _resend;
}

const FROM = process.env.EMAIL_FROM || "orders@vprcollection.com";
const STORE_NAME = process.env.NEXT_PUBLIC_STORE_NAME || "VPR Collection";

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

/** Human label for a ShipEngine carrier code. */
function carrierLabel(code: string): string {
  switch (code?.toLowerCase()) {
    case "stamps_com":
    case "usps":
      return "USPS";
    case "ups":
      return "UPS";
    case "fedex":
      return "FedEx";
    case "dhl":
    case "dhl_express":
      return "DHL";
    default:
      return code || "the carrier";
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendOrderShippedEmail(
  eventId: string,
  data: OrderEventData,
): Promise<void> {
  if (!data.customerEmail) {
    console.warn(`[email] order.shipped ${data.orderNumber} has no email`);
    return;
  }

  const orderNumber = escapeHtml(data.orderNumber);
  const s = data.shipment;

  const trackingBlock = s
    ? `
      <p style="margin:16px 0;">
        Carrier: <strong>${escapeHtml(carrierLabel(s.carrier))}</strong><br />
        Tracking: <strong>${escapeHtml(s.trackingNumber)}</strong>
      </p>
      ${
        s.trackingUrl
          ? `<p style="margin:24px 0;">
               <a href="${escapeHtml(s.trackingUrl)}"
                  style="background:#111;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block;">
                 Track your package
               </a>
             </p>`
          : ""
      }`
    : "<p style=\"margin:16px 0;\">Tracking details will follow shortly.</p>";

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
      <h1 style="font-size:22px;margin:0 0 8px;">Your order has shipped</h1>
      <p style="color:#555;margin:0 0 16px;">Order ${orderNumber}</p>
      ${trackingBlock}
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
      <p style="color:#888;font-size:13px;margin:0;">${escapeHtml(STORE_NAME)}</p>
    </div>`;

  await send({
    to: data.customerEmail,
    subject: `Your order ${data.orderNumber} has shipped`,
    html,
    idempotencyKey: eventId,
  });
}

export async function sendOrderCancelledEmail(
  eventId: string,
  data: OrderEventData,
): Promise<void> {
  if (!data.customerEmail) {
    console.warn(`[email] order.cancelled ${data.orderNumber} has no email`);
    return;
  }

  const orderNumber = escapeHtml(data.orderNumber);
  const reasonBlock = data.reason
    ? `<p style="margin:16px 0;">Reason: ${escapeHtml(data.reason)}</p>`
    : "";

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111;">
      <h1 style="font-size:22px;margin:0 0 8px;">Your order was cancelled</h1>
      <p style="color:#555;margin:0 0 16px;">Order ${orderNumber}</p>
      ${reasonBlock}
      <p style="margin:16px 0;">
        If you were charged, a refund will be issued to your original payment
        method. Reply to this email if you have questions.
      </p>
      <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
      <p style="color:#888;font-size:13px;margin:0;">${escapeHtml(STORE_NAME)}</p>
    </div>`;

  await send({
    to: data.customerEmail,
    subject: `Your order ${data.orderNumber} was cancelled`,
    html,
    idempotencyKey: eventId,
  });
}

async function send(opts: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}): Promise<void> {
  if (!process.env.RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set — skipping send");
    return;
  }

  const { error } = await getResend().emails.send(
    {
      from: FROM,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
    },
    { idempotencyKey: opts.idempotencyKey },
  );

  if (error) {
    // A 409 means this key was already used with a DIFFERENT payload — i.e. a
    // real duplicate we should not retry. Anything else, throw so the route
    // returns 500 and the WMS retries.
    if (error.name === "invalid_idempotent_request") {
      console.error(`[email] idempotency conflict for ${opts.idempotencyKey}`);
      return;
    }
    throw new Error(`Resend failed: ${error.name}: ${error.message}`);
  }
}
