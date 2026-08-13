import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { friendlyStatus } from "@/components/order-status-card";
import { tryGetAuthedClient } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";
import { formatPrice } from "@/lib/format";

/**
 * A customer's own order, in full.
 *
 * Distinct from /orders/[token], which is deliberately thin — that page is
 * reachable by anyone holding the emailed link, so it shows status and
 * tracking and nothing else. This one is behind a session, so the customer can
 * see what they bought and what they paid.
 */

export const dynamic = "force-dynamic";

/**
 * Payment status in the customer's terms. AUTHORIZED is the one that matters:
 * their bank shows a pending charge, and "authorized" would send them looking
 * for a problem that isn't there.
 */
function friendlyPaymentStatus(status: string): string {
  switch (status) {
    case "PAID":
      return "Charged";
    case "AUTHORIZED":
      return "Held — charged when your order ships";
    case "REFUNDED":
      return "Refunded";
    case "PARTIALLY_REFUNDED":
      return "Partially refunded";
    case "FAILED":
      return "Not charged";
    case "UNPAID":
    case "UNPAID_OVERDUE":
      return "Payment due";
    default:
      return "";
  }
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const client = await tryGetAuthedClient();
  if (!client) redirect(`/login?redirect=/account/orders/${id}`);

  let order;
  try {
    const res = await client.getOrder(id);
    order = res.order;
  } catch (err) {
    if (err instanceof WmsError) {
      // The WMS scopes this query to the signed-in customer, so "not yours"
      // and "doesn't exist" are the same 404 — correctly, since distinguishing
      // them would confirm another customer's order id.
      if (err.status === 404) notFound();
      // An expired JWT satisfies the cookie-only session check and only fails
      // here.
      if (err.status === 401) redirect(`/login?redirect=/account/orders/${id}`);
    }
    throw err;
  }

  const { label, detail } = friendlyStatus(order.status);

  // Line totals are what the customer was actually charged. Summing them gives
  // the goods subtotal; anything between that and totalAmount is shipping or
  // tax, so it's shown as a line rather than quietly absorbed.
  const subtotal = order.items.reduce((sum, i) => sum + i.totalPrice, 0);
  const adjustments = Number((order.totalAmount - subtotal).toFixed(2));

  return (
    <div className="mx-auto max-w-3xl mt-12">
      <Breadcrumbs
        items={[
          { label: "Account", href: "/account" },
          { label: "Orders", href: "/account/orders" },
          { label: order.orderNumber },
        ]}
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Order {order.orderNumber}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {label}
          </h1>
          {detail && (
            <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {new Date(order.createdAt).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Tracking first — on any order that has shipped it's the only thing
          the customer opened this page to find. */}
      {order.shipments && order.shipments.length > 0 && (
        <div className="mt-6 space-y-2 rounded-lg border bg-card p-4">
          <p className="text-sm font-medium">
            {order.shipments.length > 1
              ? `${order.shipments.length} shipments`
              : "Tracking"}
          </p>
          {order.shipments.map((s, i) => (
            <div
              key={s.trackingNumber ?? i}
              className="flex flex-wrap items-baseline gap-x-2 text-sm"
            >
              <span className="text-muted-foreground">{s.carrier}</span>
              {s.trackingUrl && s.trackingNumber ? (
                <a
                  href={s.trackingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono underline underline-offset-4"
                >
                  {s.trackingNumber}
                </a>
              ) : (
                <span className="font-mono">{s.trackingNumber ?? "—"}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Items */}
      <div className="mt-6 overflow-hidden rounded-lg border bg-card">
        {order.items.map((item, i) => (
          <div
            key={`${item.sku}-${i}`}
            className="flex items-center gap-3 border-b p-3 last:border-b-0 sm:gap-4 sm:p-4"
          >
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted sm:h-16 sm:w-16">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.productName}
                  className="h-full w-full object-contain"
                />
              ) : null}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">{item.productName}</p>
              <p className="font-mono text-[11px] text-muted-foreground">
                {item.sku}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {item.quantity} × {formatPrice(item.unitPrice)}
                {/* Only worth saying when it differs — on a fully shipped
                    order this would be noise on every line. */}
                {item.quantityShipped != null &&
                  item.quantityShipped > 0 &&
                  item.quantityShipped < item.quantity &&
                  ` · ${item.quantityShipped} shipped`}
              </p>
            </div>

            <p className="shrink-0 text-sm font-medium tabular-nums">
              {formatPrice(item.totalPrice)}
            </p>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="mt-4 rounded-lg border bg-card p-4">
        <div className="space-y-1.5 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span className="tabular-nums">{formatPrice(subtotal)}</span>
          </div>
          {adjustments !== 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Shipping &amp; tax</span>
              <span className="tabular-nums">{formatPrice(adjustments)}</span>
            </div>
          )}
          <Separator className="my-2" />
          <div className="flex justify-between text-base font-semibold">
            <span>Total</span>
            <span className="tabular-nums">
              {formatPrice(order.totalAmount)}
            </span>
          </div>
        </div>
      </div>

      {/* Addresses */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Shipped to
          </p>
          <address className="text-sm not-italic leading-relaxed">
            {order.shippingAddress.name}
            <br />
            {order.shippingAddress.address1}
            {order.shippingAddress.address2 && (
              <>
                <br />
                {order.shippingAddress.address2}
              </>
            )}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
            {order.shippingAddress.zip}
          </address>
        </div>

        {/* Payment method rather than the billing address. A customer
            checking an old order wants to know WHICH CARD they used — the
            billing address is something they typed and rarely need back. */}
        <div className="rounded-lg border bg-card p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Payment
          </p>
          {order.paymentMethod?.last4 ? (
            <p className="text-sm">
              {order.paymentMethod.brand ?? "Card"} ending in{" "}
              <span className="font-mono text-xs py-1 px-2 rounded-md border bg-muted">
                {order.paymentMethod.last4}
              </span>
            </p>
          ) : (
            /* No payment row means a terms or invoiced order — saying
               "no card" would read as a failure rather than the arrangement
               it is. */
            <p className="text-sm text-muted-foreground">
              {order.paymentStatus === "PAID" ? "Paid" : "Invoiced"}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            {friendlyPaymentStatus(order.paymentStatus)}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <Button asChild variant="outline">
          <Link href="/account/orders">Back to orders</Link>
        </Button>
      </div>
    </div>
  );
}
