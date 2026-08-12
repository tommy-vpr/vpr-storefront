"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuantityRow, QuantityRowHeader } from "@/components/quantity-row";
import { CartSummaryBar } from "@/components/cart-summary-bar";
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

  const [query, setQuery] = useState(initialQuery);

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
          className="cursor-pointer bg-primary hover:bg-primary/90 transition p-4 text-white"
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
        <QuantityRowHeader />

        {variants.length === 0 ? (
          <p className="px-3 py-10 text-center text-sm text-muted-foreground">
            Nothing matched. Try a different search or collection.
          </p>
        ) : (
          <div className="divide-y">
            {variants.map((v) => (
              <QuantityRow key={v.variantId} item={v} />
            ))}
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

      <CartSummaryBar />
    </div>
  );
}
