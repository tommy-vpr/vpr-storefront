import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { ProductListItem } from "@/lib/wms/types";
import { AlertCircle } from "lucide-react";

/**
 * `pricesHidden` is set on a WHOLESALE store for a signed-out visitor.
 *
 * Products stay browsable — that's how a prospective buyer decides to ask for
 * an account, and it's what search engines see. Only the price is withheld,
 * because on a wholesale site there is no such thing as "the" price: what a
 * customer pays depends on their account, so showing list would be showing a
 * number nobody actually pays.
 */
export function ProductCard({
  product,
  pricesHidden = false,
  fromCollection,
}: {
  product: ProductListItem;
  pricesHidden?: boolean;
  /**
   * Slug of the collection this card was rendered in. Passed through so the
   * product page can show a breadcrumb back to it — the product itself has no
   * idea which collections it belongs to.
   */
  fromCollection?: string;
}) {
  return (
    <Link
      href={`/products/${product.defaultVariantId ?? product.variantId}${
        fromCollection ? `?from=${encodeURIComponent(fromCollection)}` : ""
      }`}
      className="group flex flex-col overflow-hidden rounded-lg border bg-card transition hover:border-foreground/30 hover:shadow-sm"
    >
      <div className="relative aspect-square bg-muted">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.brand && (
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            {product.brand}
          </p>
        )}
        <h3 className="line-clamp-2 text-sm font-medium leading-tight group-hover:underline">
          {product.name}
        </h3>
        {product.variantCount > 1 ? (
          <p className="text-xs text-muted-foreground">
            {product.variants.map((v) => v.label).join(" · ")}
          </p>
        ) : null}

        <div className="mt-auto pt-2">
          {/* Retail is guest-first: price is public. A variant with no
              sellingPrice is not orderable at all, so it reads as unavailable
              rather than as something to sign in for. */}
          {pricesHidden ? (
            <p className="text-xs font-medium text-orange-600 flex gap-1 items-center">
              <AlertCircle className="w-3 h-3" /> Sign in to see price
            </p>
          ) : product.price !== null ? (
            <p className="text-sm font-medium">
              {formatPrice(product.price)}
              {/* Only rendered when the customer's price is actually lower —
                  the API sends listPrice as null otherwise, so there's no
                  judgement call here about whether a strike-through means
                  anything. */}
              {product.listPrice != null && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground line-through">
                  {formatPrice(product.listPrice)}
                </span>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">Unavailable</p>
          )}
        </div>
      </div>
    </Link>
  );
}
