import { Separator } from "@/components/ui/separator";
import { formatPrice } from "@/lib/format";
import type { OrderStatus } from "@/lib/wms/types";

/**
 * The order status display, shared by the token page and the lookup fallback.
 *
 * Both routes show the SAME thing on purpose: the customer's question is
 * identical whether they arrived from the emailed link or typed their order
 * number, and two divergent renderings of the same data is how one of them
 * silently stops matching the other.
 *
 * It shows only what the WMS is willing to hand to anyone holding a link or an
 * order number — status, total, tracking. No line items, addresses or prices
 * beyond the total.
 */

export function friendlyStatus(status: string): {
  label: string;
  detail: string;
} {
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

export function OrderStatusCard({ order }: { order: OrderStatus }) {
  const { label, detail } = friendlyStatus(order.status);

  return (
    <div>
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
              Tracking{order.carrier ? ` · ${order.carrier}` : ""}
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
    </div>
  );
}
