import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getClient, isLoggedIn } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";
import { ProductCard } from "@/components/product-card";

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let data;
  try {
    data = await getClient().getCollection(slug, { take: 60 });
  } catch (err) {
    if (err instanceof WmsError && err.status === 404) notFound();
    throw err;
  }

  const showPrice = await isLoggedIn();

  console.log(
    "COLLECTION PAGE:",
    slug,
    "→",
    data?.products?.length ?? "no products",
  );

  return (
    <div className="container mx-auto p-4 lg:p-12">
      <div className="mb-8">
        <Button asChild variant="ghost" size="sm" className="-ml-3 mb-4">
          <Link href="/all-collections" className="flex items-center gap-1">
            <ChevronLeft className="mr-1 h-4 w-4" />
            All collections
          </Link>
        </Button>

        <h1 className="text-3xl font-semibold tracking-tight">
          {data.collection.name}
        </h1>
        {data.collection.description && (
          <p className="mt-2 text-muted-foreground">
            {data.collection.description}
          </p>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          {data.total} {data.total === 1 ? "product" : "products"}
        </p>
      </div>

      {data.products.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          No products in this collection yet.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {data.products.map((p) => (
            <ProductCard key={p.variantId} product={p} showPrice={showPrice} />
          ))}
        </div>
      )}
    </div>
  );
}
