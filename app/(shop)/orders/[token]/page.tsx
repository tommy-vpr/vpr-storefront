import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getClient } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";
import { formatPrice } from "@/lib/format";

/**
 * Order status by guest token — the confirmation page AND the link in every
 * email about this order.
 *
 * One page for both because the customer's question is the same on day zero
 * and day five: where is my order. The token is high-entropy and store-scoped
 * server-side, so a link from one brand can't resolve on another.
 *
 * Deliberately no line items, addresses or prices beyond the total: the WMS
 * withholds them on this route, because anyone holding the link can see this.
 */

export const dynamic = "force-dynamic";

function friendlyStatus(status: string): { label: string; detail: string } {
  switch (status) {
    case "PENDING":
    case "CONFIRMED":
      return {
        label: "Order received",
        detail: "We've got your order and it's queued for the warehouse.",
      };
    case "ALLOCATED":
    case "PICKING":
    case "PACKING":
      return {
        label: "Being prepared",
        detail: "Your order is being picked and packed.",
      };
    case "PARTIALLY_SHIPPED":
      return {
        label: "Partly on its way",
        detail: "Some of your order has shipped; the rest follows shortly.",
      };
    case "SHIPPED":
      return { label: "Shipped", detail: "Your order is on its way." };
    case "DELIVERED":
      return { label: "Delivered", detail: "Your order has been delivered." };
    case "CANCELLED":
      return {
        label: "Cancelled",
        detail:
          "This order was cancelled. If you were charged, the amount has been returned.",
      };
    default:
      return { label: status, detail: "" };
  }
}

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  let order;
  try {
    const res = await getClient().getOrderByToken(token);
    order = res.order;
  } catch (err) {
    // The WMS returns an identical 404 for a malformed token, an unknown one,
    // and one belonging to another store. Nothing to distinguish here either.
    if (err instanceof WmsError && err.status === 404) notFound();
    throw err;
  }

  const { label, detail } = friendlyStatus(order.status);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-sm text-muted-foreground">Order {order.orderNumber}</p>
      <h1 className="mt-1 text-3xl font-semibold tracking-tight">{label}</h1>
      {detail && <p className="mt-2 text-muted-foreground">{detail}</p>}

      <div className="mt-8 rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Order total</span>
          <span className="font-medium">{formatPrice(order.totalAmount)}</span>
        </div>

        <Separator className="my-4" />

        {order.trackingNumber ? (
          <div className="space-y-1 text-sm">
            <p className="text-muted-foreground">
              Tracking{order.carrier ? ` · ${order.carrier.toUpperCase()}` : ""}
            </p>
            {order.trackingUrl ? (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm underline underline-offset-4"
              >
                {order.trackingNumber}
              </a>
            ) : (
              <p className="font-mono text-sm">{order.trackingNumber}</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tracking appears here as soon as your order ships.
          </p>
        )}
      </div>

      <p className="mt-6 text-sm text-muted-foreground">
        Bookmark this page — it&apos;s the quickest way back to your order
        status, and the link never expires.
      </p>

      <div className="mt-8">
        <Button asChild variant="outline">
          <Link href="/all-collections">Continue shopping</Link>
        </Button>
      </div>
    </div>
  );
}
