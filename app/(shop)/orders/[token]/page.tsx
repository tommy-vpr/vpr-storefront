import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getClient } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";
import { OrderStatusCard } from "@/components/order-status-card";

/**
 * Order status by guest token — the confirmation page AND the link in every
 * email about this order.
 *
 * One page for both because the customer's question is the same on day zero
 * and day five: where is my order. The token is high-entropy and store-scoped
 * server-side, so a link from one brand can't resolve on another.
 *
 * The display itself lives in OrderStatusCard, shared with the lookup
 * fallback, so the two routes can't drift into showing different things about
 * the same order.
 */

export const dynamic = "force-dynamic";

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

  return (
    <div className="mx-auto max-w-2xl">
      <OrderStatusCard order={order} />

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
