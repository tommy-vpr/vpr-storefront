import { notFound } from "next/navigation";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { WmsError } from "@/lib/wms/client";
import { getClient } from "@/lib/wms/session";

/**
 * Collection metadata: title, description, product count.
 *
 * Only calls getCollection(slug) — no products, no session read. That keeps
 * this cacheable independently of the product grid, which changes far more
 * often.
 *
 * Owns the 404: an unknown slug should not render a shell.
 */
export async function CollectionHeader({ slug }: { slug: string }) {
  let data;
  try {
    data = await getClient().getCollection(slug);
  } catch (err) {
    if (err instanceof WmsError && err.status === 404) notFound();
    throw err;
  }

  const { collection } = data;
  // Prefer the metadata field once the WMS returns it; fall back to `total`.
  const count = collection.productCount ?? data.total;

  return (
    <div className="mb-8">
      {/* Was a "All collections" button pointing at "/" — the homepage, not
          the collections index. */}
      <Breadcrumbs
        className="mb-4"
        items={[
          { label: "Home", href: "/" },
          { label: "Collections", href: "/all-collections" },
          { label: collection.name },
        ]}
      />

      <h1 className="text-3xl font-semibold tracking-tight">
        {collection.name}
      </h1>

      {collection.description && (
        <p className="mt-2 text-muted-foreground">{collection.description}</p>
      )}

      {typeof count === "number" && (
        <p className="mt-3 text-sm text-muted-foreground">
          {count} {count === 1 ? "product" : "products"}
        </p>
      )}
    </div>
  );
}
