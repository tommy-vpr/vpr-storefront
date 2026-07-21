import { Suspense } from "react";

import { CollectionHeader } from "./CollectionHeader";
import { CollectionProducts } from "./CollectionProducts";
import { CollectionToolbar } from "./CollectionToolbar";
import { ProductsSpinner } from "./ProductsSpinner";

/**
 * Collection page.
 *
 * This component never fetches products. Each section owns its own data so
 * the shell (header + toolbar) can flush while products are still resolving.
 *
 * CollectionHeader is intentionally OUTSIDE Suspense: it owns the 404 check,
 * and a notFound() thrown from inside a Suspense boundary would render the
 * not-found UI *inside* an already-committed page shell rather than replacing
 * it. Keeping it outside means an unknown slug 404s cleanly.
 */
export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  // Serialized into the Suspense key so changing sort/search/page re-suspends
  // the product grid and shows the spinner again, instead of silently swapping.
  const productsKey = JSON.stringify(sp);

  return (
    <>
      <CollectionHeader slug={slug} />

      <CollectionToolbar />

      <Suspense key={productsKey} fallback={<ProductsSpinner />}>
        <CollectionProducts slug={slug} searchParams={sp} />
      </Suspense>
    </>
  );
}
