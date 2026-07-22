import Link from "next/link";

import { cn } from "@/lib/utils";
import type { ProductVariantOption } from "@/lib/wms/types";

/**
 * Strength / variant picker for the product detail page.
 *
 * Each option is a plain link to that variant's own detail URL, so this stays
 * a server component — no client JS, and every variant gets a crawlable,
 * shareable URL. That matters for a catalog where strength is the buying
 * decision.
 *
 * Renders nothing for single-variant products.
 */
export function VariantPicker({
  variants,
  selectedVariantId,
}: {
  variants: ProductVariantOption[];
  selectedVariantId: string;
}) {
  if (!variants || variants.length <= 1) return null;

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Options
      </p>
      <div className="flex flex-wrap gap-2" role="group">
        {variants.map((v) => {
          const isSelected = v.variantId === selectedVariantId;
          return (
            <Link
              key={v.variantId}
              href={`/products/${v.variantId}`}
              aria-current={isSelected ? "true" : undefined}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm transition",
                isSelected
                  ? "border-foreground bg-foreground text-background"
                  : "border-input hover:border-foreground/40 hover:bg-accent",
              )}
            >
              {v.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
