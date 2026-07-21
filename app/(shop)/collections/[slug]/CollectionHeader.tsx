import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
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
      <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
        <Link href="/" className="flex items-center gap-1">
          <ChevronLeft className="mr-1 h-4 w-4" />
          All collections
        </Link>
      </Button>

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
