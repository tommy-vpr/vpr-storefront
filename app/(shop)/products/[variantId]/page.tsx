import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getClient, isLoggedIn } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";
import { formatPrice } from "@/lib/format";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { VariantPicker } from "@/components/variant-picker";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  const { variantId } = await params;

  let product;
  try {
    const res = await getClient().getProduct(variantId);
    product = res.product;
  } catch (err) {
    if (err instanceof WmsError && err.status === 404) notFound();
    throw err;
  }

  const loggedIn = await isLoggedIn();
  const canAddToCart = loggedIn && product.price !== null;

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-6">
        <Link href="/" className="flex items-center gap-1">
          <ChevronLeft className="mr-1 h-4 w-4" />
          Back
        </Link>
      </Button>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <div className="aspect-square overflow-hidden rounded-lg border bg-muted">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}
        </div>

        <div className="flex flex-col">
          {product.brand && (
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              {product.brand}
            </p>
          )}
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {product.name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {product.variantName}
          </p>

          <VariantPicker
            variants={product.variants}
            selectedVariantId={product.selectedVariantId ?? product.variantId}
          />

          <div className="mt-6">
            {loggedIn ? (
              <p className="text-2xl font-medium">
                {formatPrice(product.price)}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link
                  href={`/login?redirect=/products/${product.variantId}`}
                  className="font-medium text-foreground underline underline-offset-4"
                >
                  Sign in
                </Link>{" "}
                to see pricing
              </p>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs">
            {product.inStock ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2 py-0.5 text-green-700 dark:bg-green-950/40 dark:text-green-400">
                <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                In stock
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                Backorder — ships when restocked
              </span>
            )}
          </div>

          <Separator className="my-6" />

          {canAddToCart ? (
            <AddToCartButton
              item={{
                variantId: product.variantId,
                productId: product.productId,
                sku: product.sku,
                name: product.name,
                variantName: product.variantName,
                imageUrl: product.imageUrl,
                price: product.price!,
              }}
            />
          ) : !loggedIn ? (
            <Button asChild size="lg" className="w-full">
              <Link href={`/login?redirect=/products/${product.variantId}`}>
                Sign in to purchase
              </Link>
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              This product isn&apos;t available for purchase right now.
            </p>
          )}

          {product.description && (
            <>
              <Separator className="my-6" />
              <div className="space-y-2">
                <h2 className="text-sm font-medium">Description</h2>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                  {product.description}
                </p>
              </div>
            </>
          )}

          <dl className="mt-8 grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            <dt className="text-muted-foreground">SKU</dt>
            <dd className="font-mono text-xs">{product.sku}</dd>
            {product.category && (
              <>
                <dt className="text-muted-foreground">Category</dt>
                <dd>{product.category}</dd>
              </>
            )}
          </dl>
        </div>
      </div>
    </>
  );
}
