import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getCatalogClient, getClient, isLoggedIn } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";
import { formatPrice } from "@/lib/format";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ProductGallery } from "@/components/product-gallery";
import { contentImageURL, getProductContent } from "@/lib/product-content";
import { productGalleryImages } from "@/lib/product-gallery";
import { getProductPageSections, getRelatedProducts } from "@/lib/product-page";
import { collectionSlugsFromRefs } from "@/lib/collection-presentation";
import { ProductCard } from "@/components/product-card";
import { convertLexicalToHTML } from "@payloadcms/richtext-lexical/html";

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

  // Editorial layer from Payload (Store → All products): curated gallery and an optional
  // description override. WMS stays the source for price/stock/variants.
  const [content, sections] = await Promise.all([getProductContent(product.productId), getProductPageSections()]);
  const description = content?.description?.trim() || product.description?.trim();
  const heroSection = sections.find((b) => b.blockType === "productHero");
  const showBrand = heroSection?.blockType === "productHero" ? heroSection.showBrand !== false : true;
  const showBreadcrumbs = heroSection?.blockType === "productHero" ? heroSection.showBreadcrumbs !== false : true;
  const galleryImages = productGalleryImages(
    product.imageUrl,
    (content?.images ?? []).map((item) => contentImageURL(item.image)),
    product.variants.map((variant) => variant.imageUrl),
  );

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

  const infoNodes: React.ReactNode[] = [];
  const HERO = Symbol("hero");
  const nodes: (React.ReactNode | typeof HERO)[] = [];
  for (const [i, b] of sections.entries()) {
    const key = `${b.blockType}-${b.id ?? i}`;
    switch (b.blockType) {
      case "productHero":
        nodes.push(HERO);
        break;
      case "productDescription":
        if (description)
          infoNodes.push(
            <div key={key}>
              <Separator className="my-6" />
              <div className="space-y-2">
                <h2 className="text-sm font-medium">{b.heading || "Description"}</h2>
                <p className="whitespace-pre-wrap text-sm text-muted-foreground">{description}</p>
              </div>
            </div>,
          );
        break;
      case "productDetails":
        infoNodes.push(
          <dl key={key} className="mt-8 grid grid-cols-[120px_1fr] gap-y-2 text-sm">
            {b.showSku !== false && (
              <>
                <dt className="text-muted-foreground">SKU</dt>
                <dd className="font-mono text-xs">{product.sku}</dd>
              </>
            )}
            {b.showCategory !== false && product.category && (
              <>
                <dt className="text-muted-foreground">Category</dt>
                <dd>{product.category}</dd>
              </>
            )}
          </dl>,
        );
        break;
      case "relatedProducts": {
        if (content?.hideRelated) break;
        const related = await getRelatedProducts({
          productId: product.productId,
          picks: (content?.related ?? []).map((r) => (typeof r === "object" ? r.wmsProductId : null)).filter((x): x is string => Boolean(x)),
          ownCollectionSlugs: await collectionSlugsFromRefs(content?.collections),
          source: b.source ?? "auto",
          fixedCollectionSlug: (await collectionSlugsFromRefs(b.collection))[0] ?? null,
          fromCollectionSlug: fromCollection?.slug ?? null,
          limit: b.limit ?? 4,
        });
        if (!related.length) break;
        nodes.push(
          <section key={key} className="mt-16">
            <h2 className="mb-6 text-2xl font-semibold tracking-tight">{b.heading || "You may also like"}</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.productId} product={p} pricesHidden={pricesHidden} fromCollection={fromCollection?.slug} />
              ))}
            </div>
          </section>,
        );
        break;
      }
      case "richText":
        infoNodes.push(
          <div key={key}>
            <Separator className="my-6" />
            {b.heading && <h2 className="text-sm font-medium mb-2">{b.heading}</h2>}
            <div className="prose prose-sm max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: convertLexicalToHTML({ data: b.content }) }} />
          </div>,
        );
        break;
      case "embed":
        nodes.push(<div key={key} className="mt-12" dangerouslySetInnerHTML={{ __html: b.html }} />);
        break;
    }
  }
  if (!nodes.includes(HERO)) nodes.unshift(HERO);

  // ── Sections (Site → Product page template) ──────────────────────────────
  // The hero is the fixed core (gallery + buy box). Text sections render in its
  // right column; wide sections (related products, embeds) render below it.
  const hero = (
    <>
      {showBreadcrumbs && (
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
      )}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-12">
        <ProductGallery images={galleryImages} title={product.name} />

        <div className="flex flex-col">
          {showBrand && product.brand && (
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
          {infoNodes}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-[70vh] max-w-7xl mx-auto mt-6 sm:mt-12">
      {nodes.map((n, i) => (n === HERO ? <div key="hero">{hero}</div> : <div key={i}>{n}</div>))}
    </div>
  );
}
