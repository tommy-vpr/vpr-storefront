import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getCatalogClient, getClient, isLoggedIn } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";
import { formatPrice } from "@/lib/format";
import { Breadcrumbs } from "@/components/breadcrumbs";

/**
 * Per-customer prices — this page must be rendered per request, not built
 * ahead of one. A statically rendered version has no cookie, so it bakes in
 * list prices and serves them to every signed-in customer too.
 */
export const dynamic = "force-dynamic";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { VariantPicker } from "@/components/variant-picker";
import { QuantityRow, QuantityRowHeader } from "@/components/quantity-row";
import { CartSummaryBar } from "@/components/cart-summary-bar";

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ variantId: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const { variantId } = await params;
  const { from } = await searchParams;

  console.log("FROM:***", from);

  let product;
  try {
    const res = await (await getCatalogClient()).getProduct(variantId);
    product = res.product;
  } catch (err) {
    if (err instanceof WmsError && err.status === 404) notFound();
    throw err;
  }

  const [{ store }, loggedIn, fromCollection] = await Promise.all([
    getClient().getStore(),
    isLoggedIn(),
    // Resolved rather than trusted: the slug decides a label shown to the
    // customer, and an unknown one should drop the crumb, not render whatever
    // was in the URL.
    from
      ? getClient()
          .getCollection(from)
          .then((d) => ({ name: d.collection.name, slug: from }))
          .catch(() => null)
      : Promise.resolve(null),
  ]);

  // Wholesale is account-priced, so a signed-out visitor has no price and
  // therefore nothing to add to a cart — an unpriced cart would check out at
  // list, which is worse than refusing. Products stay browsable either way.
  const pricesHidden = store.mode === "WHOLESALE" && !loggedIn;

  // On a wholesale store a signed-in buyer orders ACROSS the strengths, not
  // one of them — so the picker and single add-to-cart are replaced by a
  // quantity row per variant. Retail keeps the picker: a retail customer buys
  // one flavour at one strength, and a table of six would be noise.
  const bulkVariants = store.mode === "WHOLESALE" && loggedIn;

  // Retail is guest-first. The only thing that can stop a purchase there is
  // the product itself: a variant with no sellingPrice is not orderable, and
  // the WMS rejects it server-side too (POST /storefront/orders filters on
  // sellingPrice NOT NULL), so this is a display of that rule, not the rule.
  const canAddToCart = !pricesHidden && product.price !== null;

  return (
    <div className="min-h-[70vh] max-w-7xl mx-auto">
      {/* The product itself doesn't know which collections it belongs to, so
          the middle crumb comes from ?from= — set by the collection grid when
          you click through. Arriving from a search result or a shared link
          simply gets the shorter trail rather than a guessed one. */}
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          ...(fromCollection
            ? [
                {
                  label: fromCollection.name,
                  href: `/collections/${fromCollection.slug}`,
                },
              ]
            : [{ label: "Collections", href: "/all-collections" }]),
          { label: product.name },
        ]}
      />

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <div className="aspect-square overflow-hidden rounded-lg border bg-muted flex items-center justify-center">
          {product.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-2/3 object-cover"
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

          {!bulkVariants && (
            <VariantPicker
              variants={product.variants}
              selectedVariantId={product.selectedVariantId ?? product.variantId}
            />
          )}

          <div className={bulkVariants ? "hidden" : "mt-6"}>
            {pricesHidden ? (
              <Button asChild variant="outline">
                <Link href={`/login?redirect=/products/${product.variantId}`}>
                  Sign in to see price
                </Link>
              </Button>
            ) : product.price !== null ? (
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-medium">
                  {formatPrice(product.price)}
                </p>
                {product.listPrice != null && (
                  <span className="text-base text-muted-foreground line-through">
                    {formatPrice(product.listPrice)}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Not available for purchase
              </p>
            )}
          </div>

          <Separator className="my-6" />

          {bulkVariants ? (
            /* Every strength, each with its own quantity. Same component the
               quick-order form uses, so the two can't drift into behaving
               differently — they're the same interaction at different scopes. */
            <div className="overflow-hidden rounded-lg border">
              <QuantityRowHeader productLabel="Option" />
              <div className="divide-y">
                {product.variants.map((v) => (
                  <QuantityRow
                    key={v.variantId}
                    showProductName={false}
                    item={{
                      variantId: v.variantId,
                      productId: product.productId,
                      sku: v.sku,
                      productName: product.name,
                      label: v.label,
                      imageUrl: v.imageUrl ?? product.imageUrl,
                      price: v.price,
                      listPrice: v.listPrice ?? null,
                      stock: v.stock ?? null,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : canAddToCart ? (
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
          ) : pricesHidden ? (
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

          {/* Running total across the whole cart, not just this product — a
              buyer working through several products needs one number. */}
          {bulkVariants && <CartSummaryBar />}

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
    </div>
  );
}
