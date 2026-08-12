"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/format";

/**
 * Running cart total, pinned to the bottom of the viewport.
 *
 * Shows the WHOLE cart, not the current page or product. Someone entering
 * quantities across four pages of quick-order — or across two products —
 * needs one number, and needing to scroll or navigate to find it defeats the
 * point of a bulk-entry screen.
 *
 * Renders nothing when the cart is empty, so it never occupies space it
 * hasn't earned.
 */
export function CartSummaryBar() {
  const { items, itemCount, subtotal, isHydrated } = useCart();

  if (!isHydrated || itemCount === 0) return null;

  return (
    <div className="sticky bottom-0 -mx-4 mt-6 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
      <div className="w-full bg-muted text-xs rounded text-center p-1 mb-2">
        Cart content
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm">
          <span className="font-medium">
            {items.length} {items.length === 1 ? "SKU" : "SKUs"}
          </span>
          <span className="text-muted-foreground"> · {itemCount} units</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-lg font-semibold tabular-nums">
            {formatPrice(subtotal)}
          </span>
          <Button asChild size="sm">
            <Link href="/cart">Review order</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
