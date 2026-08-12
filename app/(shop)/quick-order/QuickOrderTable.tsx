"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Minus, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/format";
import type { QuickOrderVariant } from "@/lib/wms/types";

/**
 * The bulk-entry table.
 *
 * QUANTITIES LIVE IN THE CART, not in local state. That's the decision that
 * makes paging safe: a buyer who enters 12 on page 1 and moves to page 2 keeps
 * it, because the cart is the only store of truth and it persists to
 * localStorage. Local state would silently discard everything on navigation —
 * on the one screen whose entire purpose is entering a lot of numbers.
 *
 * It also means the summary is the whole cart, not the visible page, which is
 * what a buyer actually wants to know before checking out.
 */
export function QuickOrderTable({
  variants,
  collections,
  total,
  page,
  totalPages,
  initialQuery,
  initialCollection,
}: {
  variants: QuickOrderVariant[];
  collections: { id: string; name: string }[];
  total: number;
  page: number;
  totalPages: number;
  initialQuery: string;
  initialCollection: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { items, itemCount, subtotal, addItem, updateQuantity, isHydrated } =
    useCart();

  const [query, setQuery] = useState(initialQuery);

  const qtyOf = (variantId: string) =>
    items.find((i) => i.variantId === variantId)?.quantity ?? 0;

  /** Rewrites the URL so filters survive a reload and can be shared. */
  const navigate = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    // Any filter change invalidates the page number — staying on page 4 of a
    // new, shorter result set shows nothing and looks broken.
    if (!("page" in changes)) next.delete("page");
    router.push(`/quick-order?${next}`);
  };

  const setQty = (v: QuickOrderVariant, qty: number) => {
    if (v.price === null) return;
    const clamped = Math.max(0, Math.min(qty, 99_999));

    if (qtyOf(v.variantId) === 0 && clamped > 0) {
      addItem(
        {
          variantId: v.variantId,
          productId: v.productId,
          sku: v.sku,
          name: v.productName,
          variantName: v.label,
          imageUrl: v.imageUrl,
          price: v.price,
        },
        clamped,
      );
      return;
    }
    // updateQuantity handles removal at 0 — no special case needed here.
    updateQuantity(v.variantId, clamped);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate({ q: query || null });
            }}
            placeholder="Search SKU, flavour or product…"
            className="pl-8 pr-8"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                navigate({ q: null });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <select
          value={initialCollection}
          onChange={(e) => navigate({ collection: e.target.value || null })}
          className="h-9 rounded-md border bg-background px-2 text-sm"
        >
          {/* Defaults to everything — a reorder buyer usually knows the SKU and
              wants to search across the catalogue, not pick a category first. */}
          <option value="">All collections</option>
          {collections.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => navigate({ q: query || null })}
        >
          Search
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {total} {total === 1 ? "item" : "items"}
        {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
      </p>

      {/* Rows — compact by design: a buyer scans dozens of these, so the row
          is one line with no image and no wrapping where avoidable. */}
      <div className="overflow-hidden rounded-lg border">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b bg-muted/40 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          <span>Product</span>
          <span className="w-24 text-right">Price</span>
          <span className="w-[136px] text-center">Qty</span>
        </div>

        {variants.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">
            Nothing matched. Try a different search or collection.
          </p>
        ) : (
          <div className="divide-y">
            {variants.map((v) => {
              const qty = qtyOf(v.variantId);
              const unavailable = v.price === null;
              return (
                <div
                  key={v.variantId}
                  className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-2 ${
                    qty > 0 ? "bg-primary/[0.03]" : ""
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm">
                      {v.productName}
                      {v.label && (
                        <span className="text-muted-foreground">
                          {" "}
                          · {v.label}
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {v.sku}
                    </p>
                  </div>

                  <div className="w-24 text-right">
                    {unavailable ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <>
                        <span className="text-sm font-medium tabular-nums">
                          {formatPrice(v.price!)}
                        </span>
                        {v.listPrice != null && (
                          <span className="ml-1 text-[11px] text-muted-foreground line-through">
                            {formatPrice(v.listPrice)}
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
                      onClick={() => setQty(v, qty - 1)}
                      aria-label="Decrease"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>

                    <Input
                      value={isHydrated ? (qty === 0 ? "" : qty) : ""}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/[^\d]/g, "");
                        setQty(v, raw === "" ? 0 : parseInt(raw, 10));
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
                      onClick={() => setQty(v, qty + 1)}
                      aria-label="Increase"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => navigate({ page: String(page - 1) })}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => navigate({ page: String(page + 1) })}
          >
            Next
          </Button>
        </div>
      )}

      {/* Sticky summary — the whole cart, not this page. Someone who has
          entered quantities across four pages needs one number, and it must
          not require scrolling to find. */}
      {isHydrated && itemCount > 0 && (
        <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
          <div className="flex items-center justify-between gap-4">
            <div className="text-sm">
              <span className="font-medium">
                {items.length} {items.length === 1 ? "SKU" : "SKUs"}
              </span>
              <span className="text-muted-foreground">
                {" "}
                · {itemCount} units
              </span>
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
      )}
    </div>
  );
}
