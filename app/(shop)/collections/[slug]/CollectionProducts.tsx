import { ProductCard } from "@/components/product-card";
import { DEFAULT_PAGE_SIZE } from "@/lib/wms/client";
import { getClient } from "@/lib/wms/session";
import type { CollectionSort } from "@/lib/wms/types";

import { Pagination } from "./Pagination";

const SORTS: CollectionSort[] = [
  "featured",
  "name-asc",
  "name-desc",
  "price-asc",
  "price-desc",
  "newest",
];

/** Query params the toolbar owns; everything else is treated as a filter. */
const RESERVED = new Set(["page", "sort", "q", "cursor", "take"]);

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

/**
 * The streamed section. Owns product fetching and the grid.
 *
 * It no longer reads the session: retail is guest-first, so pricing is public
 * and nothing here depends on who is asking. It stays behind Suspense because
 * the product fetch is the slow part of the page, not because it is dynamic.
 */
export async function CollectionProducts({
  slug,
  searchParams = {},
}: {
  slug: string;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const take = Number(first(searchParams.take)) || DEFAULT_PAGE_SIZE;
  const page = Math.max(1, Number(first(searchParams.page)) || 1);
  const skip = (page - 1) * take;

  const rawSort = first(searchParams.sort) as CollectionSort | undefined;
  const sort = rawSort && SORTS.includes(rawSort) ? rawSort : undefined;

  const filters: Record<string, string | string[]> = {};
  for (const [key, value] of Object.entries(searchParams)) {
    if (RESERVED.has(key) || value === undefined) continue;
    filters[key] = value;
  }

  const { products, pageInfo } = await getClient().getCollectionProducts(slug, {
    take,
    skip,
    sort,
    search: first(searchParams.q),
    filters,
  });

  if (products.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        {page > 1
          ? "No more products on this page."
          : "No products in this collection yet."}
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => (
          <ProductCard key={p.variantId} product={p} />
        ))}
      </div>

      <Pagination page={page} pageInfo={pageInfo} searchParams={searchParams} />
    </>
  );
}
