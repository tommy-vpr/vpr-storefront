"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/format";

/**
 * One orderable variant with a quantity control.
 *
 * Shared by the quick-order form and the wholesale product page so the two
 * cannot drift — they are the same interaction at different scopes (the whole
 * catalogue vs one product's strengths), and a second hand-written copy is how
 * one of them quietly loses the cart-backed behaviour below.
 *
 * QUANTITY LIVES IN THE CART, not in local state. On quick-order that's what
 * makes paging safe; on the product page it's what makes the number survive a
 * click through to another product and back. The cart is the only store of
 * truth and it persists, so nothing typed is ever silently discarded.
 */

export interface QuantityRowItem {
  variantId: string;
  productId: string;
  sku: string;
  /** Product name — shown on quick-order, redundant on a product page. */
  productName: string;
  /** Strength or option, product name stripped. */
  label: string;
  imageUrl: string | null;
  price: number | null;
  /** Catalogue price, present only when this customer pays less. */
  listPrice: number | null;
}

export function QuantityRow({
  item,
  showProductName = true,
}: {
  item: QuantityRowItem;
  showProductName?: boolean;
}) {
  const { items, addItem, updateQuantity, isHydrated } = useCart();

  const qty = items.find((i) => i.variantId === item.variantId)?.quantity ?? 0;
  const unavailable = item.price === null;

  const setQty = (next: number) => {
    if (item.price === null) return;
    const clamped = Math.max(0, Math.min(next, 99_999));

    if (qty === 0 && clamped > 0) {
      addItem(
        {
          variantId: item.variantId,
          productId: item.productId,
          sku: item.sku,
          name: item.productName,
          variantName: item.label,
          imageUrl: item.imageUrl,
          price: item.price,
        },
        clamped,
      );
      return;
    }
    // updateQuantity removes the line at 0, so no special case here.
    updateQuantity(item.variantId, clamped);
  };

  return (
    <div
      className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2 ${
        qty > 0 ? "bg-primary/[0.03]" : ""
      }`}
    >
      <div className="min-w-0">
        <p className="truncate text-sm">
          {showProductName ? (
            <>
              {item.productName}
              {item.label && (
                <span className="text-muted-foreground"> · {item.label}</span>
              )}
            </>
          ) : (
            <span className="font-medium">{item.label || item.sku}</span>
          )}
        </p>
        <p className="font-mono text-[11px] text-muted-foreground">
          {item.sku}
        </p>
      </div>

      <div className="w-24 text-right">
        {unavailable ? (
          <span className="text-xs text-muted-foreground">—</span>
        ) : (
          <>
            <span className="text-sm font-medium tabular-nums">
              {formatPrice(item.price!)}
            </span>
            {item.listPrice != null && (
              <span className="ml-1 text-[11px] text-muted-foreground line-through">
                {formatPrice(item.listPrice)}
              </span>
            )}
          </>
        )}
      </div>

      <div className="flex w-[136px] items-center justify-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={unavailable || !isHydrated || qty === 0}
          onClick={() => setQty(qty - 1)}
          aria-label="Decrease"
        >
          <Minus className="h-3 w-3" />
        </Button>

        <Input
          // Empty rather than "0" until hydrated: rendering a server-side 0
          // that then becomes 12 is a visible flicker on every row.
          value={isHydrated ? (qty === 0 ? "" : qty) : ""}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^\d]/g, "");
            setQty(raw === "" ? 0 : parseInt(raw, 10));
          }}
          disabled={unavailable || !isHydrated}
          inputMode="numeric"
          placeholder="0"
          className="h-7 w-14 px-1 text-center text-sm tabular-nums"
        />

        <Button
          variant="outline"
          size="icon"
          className="h-7 w-7"
          disabled={unavailable || !isHydrated}
          onClick={() => setQty(qty + 1)}
          aria-label="Increase"
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

/** Column headings, so both tables label their columns identically. */
export function QuantityRowHeader({ productLabel = "Product" }: { productLabel?: string }) {
  return (
    <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
      <span>{productLabel}</span>
      <span className="w-24 text-right">Price</span>
      <span className="w-[136px] text-center">Qty</span>
    </div>
  );
}
