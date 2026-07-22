import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { ProductListItem } from "@/lib/wms/types";

export function ProductCard({
  product,
  showPrice,
}: {
  product: ProductListItem;
  showPrice: boolean;
}) {
  return (
    <Link
      href={`/products/${product.defaultVariantId ?? product.variantId}`}
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
          {showPrice ? (
            <p className="text-sm font-medium">{formatPrice(product.price)}</p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Sign in for pricing
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
