"use client";

import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/format";
import type { StockBand } from "@/lib/wms/types";

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
 *
 * TWO LAYOUTS, one component:
 *
 *   Mobile    — stacked. Name on its own line with room to wrap, then SKU and
 *               stock, then price and stepper side by side. A three-column
 *               grid at 375px leaves ~180px for a 60-character product name,
 *               which wraps to four lines while price and qty sit pinned to
 *               the right of a mostly empty row.
 *   sm and up — the three-column table, which is what makes a 50-row page
 *               scannable.
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
  stock?: StockBand | null;
}

/**
 * Bands, not counts. "Low" is the useful one: it tells a buyer to expect a
 * conversation about quantity without telling them how much we hold.
 *
 * OUT is deliberately not a block — this business backorders, so the line is
 * orderable and simply won't ship immediately.
 */
const STOCK_LABELS: Record<StockBand, { label: string; className: string }> = {
  IN: {
    label: "In stock",
    className: "text-green-600 rounded-full px-2 p-0.5 bg-green-50",
  },
  LOW: {
    label: "Low stock",
    className: "text-amber-600 rounded-full px-2 p-0.5 bg-amber-50",
  },
  OUT: {
    label: "Out of stock",
    className: "text-orange-600 rounded-full px-2 p-0.5 bg-orange-50",
  },
};

export function QuantityRow({
  item,
  showProductName = true,
  index = 0,
}: {
  item: QuantityRowItem;
  showProductName?: boolean;
  index?: number;
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

  // Extracted so the two layouts can't drift — a stepper that behaves
  // differently on a phone is exactly the kind of thing nobody notices until a
  // rep is standing in a warehouse.
  const stepper = (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        // 36px on touch, 28px on desktop. Anything smaller is a miss-tap on a
        // control people press dozens of times per order.
        className="h-9 w-9 sm:h-7 sm:w-7 cursor-pointer"
        disabled={unavailable || !isHydrated || qty === 0}
        onClick={() => setQty(qty - 1)}
        aria-label="Decrease"
      >
        <Minus className="h-3 w-3" />
      </Button>

      <Input
        // Empty rather than "0" until hydrated: rendering a server-side 0 that
        // then becomes 12 is a visible flicker on every row.
        value={isHydrated ? (qty === 0 ? "" : qty) : ""}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^\d]/g, "");
          setQty(raw === "" ? 0 : parseInt(raw, 10));
        }}
        disabled={unavailable || !isHydrated}
        inputMode="numeric"
        placeholder="0"
        className="h-9 w-14 px-1 text-center text-sm tabular-nums sm:h-7"
      />

      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 sm:h-7 sm:w-7 cursor-pointer"
        disabled={unavailable || !isHydrated}
        onClick={() => setQty(qty + 1)}
        aria-label="Increase"
      >
        <Plus className="h-3 w-3" />
      </Button>
    </div>
  );

  const priceBlock = unavailable ? (
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
  );

  const nameBlock = showProductName ? (
    <>
      {item.productName}
      {item.label && (
        <span className="text-muted-foreground"> · {item.label}</span>
      )}
    </>
  ) : (
    <span className="font-medium">{item.label || item.sku}</span>
  );

  return (
    <div
      className={`px-3 py-2.5 ${
        qty > 0
          ? "bg-primary/[0.03]"
          : index % 2 === 0
            ? "bg-background"
            : "bg-muted"
      }`}
    >
      {/* ── Mobile: stacked ─────────────────────────────────────────────── */}
      <div className="sm:hidden">
        <p className="text-sm leading-snug">{nameBlock}</p>

        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="font-mono text-[11px] text-muted-foreground">
            {item.sku}
          </span>
          {item.stock && (
            <span
              className={`text-[11px] ${STOCK_LABELS[item.stock].className}`}
            >
              {STOCK_LABELS[item.stock].label}
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <div>{priceBlock}</div>
          {stepper}
        </div>
      </div>

      {/* ── sm and up: the scannable table row ──────────────────────────── */}
      <div className="hidden sm:grid sm:grid-cols-[1fr_auto_auto] sm:items-center sm:gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm">{nameBlock}</p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {item.sku}
            {item.stock && (
              <span
                className={`ml-2 font-sans ${STOCK_LABELS[item.stock].className}`}
              >
                {STOCK_LABELS[item.stock].label}
              </span>
            )}
          </p>
        </div>

        <div className="w-24 text-right">{priceBlock}</div>

        <div className="flex w-[136px] items-center justify-center">
          {stepper}
        </div>
      </div>
    </div>
  );
}

/**
 * Column headings. Hidden on mobile, where the rows are stacked cards and
 * headings would label nothing.
 */
export function QuantityRowHeader({
  productLabel = "Product",
}: {
  productLabel?: string;
}) {
  return (
    <div className="hidden border-b bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[1fr_auto_auto] sm:gap-3">
      <span>{productLabel}</span>
      <span className="w-24 text-right">Price</span>
      <span className="w-[136px] text-center">Qty</span>
    </div>
  );
}
