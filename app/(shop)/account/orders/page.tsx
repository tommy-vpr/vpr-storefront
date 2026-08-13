import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { tryGetAuthedClient } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";
import { friendlyStatus } from "@/components/order-status-card";
import { formatPrice } from "@/lib/format";

/**
 * Order history.
 *
 * Only shows orders placed WHILE SIGNED IN. Guest orders are deliberately not
 * attached to an account by matching email — see the register endpoint for
 * why — so a customer who ordered as a guest and later signed up will find
 * this empty. The empty state says so and points at the lookup page, because
 * "where are my orders" is otherwise a support ticket.
 *
 * getOrders is customer-scoped server-side by the JWT, so there is nothing to
 * filter here: the WMS cannot return another customer's orders through it.
 */

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const client = await tryGetAuthedClient();
  if (!client) redirect("/login?redirect=/account/orders");

  const { page } = await searchParams;
  const pageNum = Math.max(1, Number(page) || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;

  let orders;
  let total;
  try {
    const res = await client.getOrders({ skip, take: PAGE_SIZE });
    orders = res.orders;
    total = res.total;
  } catch (err) {
    // An expired JWT passes isLoggedIn (which only checks the cookie exists)
    // and fails here. Sending them to log in again is the useful answer.
    if (err instanceof WmsError && err.status === 401) {
      redirect("/login?redirect=/account/orders");
    }
    throw err;
  }

  const hasMore = skip + orders.length < total;

  return (
    <div className="mx-auto max-w-2xl mt-12">
      <h1 className="text-3xl font-semibold tracking-tight">Your orders</h1>

      {orders.length === 0 ? (
        <div className="mt-8 rounded-lg border bg-card p-6">
          <p className="text-muted-foreground">
            No orders on this account yet.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Ordered as a guest? Those aren&apos;t linked to an account — use the
            tracking link from your confirmation email, or{" "}
            <Link
              href="/orders/lookup"
              className="font-medium text-foreground underline underline-offset-4"
            >
              look it up
            </Link>{" "}
            with your order number.
          </p>
          <Button asChild className="mt-6">
            <Link href="/all-collections">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-8 divide-y rounded-lg border bg-card">
            {orders.map((o) => {
              const { label } = friendlyStatus(o.status);
              return (
                <div
                  key={o.id}
                  className="flex items-center justify-between gap-4 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{o.orderNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {label} ·{" "}
                      {new Date(o.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}{" "}
                      · {o.itemCount} item{o.itemCount === 1 ? "" : "s"}
                    </p>
                    {o.trackingNumber && (
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {o.trackingNumber}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium">{formatPrice(o.totalAmount)}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {(pageNum > 1 || hasMore) && (
            <>
              <Separator className="my-6" />
              <div className="flex justify-between">
                {pageNum > 1 ? (
                  <Button asChild variant="outline">
                    <Link href={`/account/orders?page=${pageNum - 1}`}>
                      Previous
                    </Link>
                  </Button>
                ) : (
                  <span />
                )}
                {hasMore && (
                  <Button asChild variant="outline">
                    <Link href={`/account/orders?page=${pageNum + 1}`}>
                      Next
                    </Link>
                  </Button>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
