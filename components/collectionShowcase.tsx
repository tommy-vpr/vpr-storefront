import Image from "next/image";
import Link from "next/link";

// Maps a collection slug → its hero image. Slugs not listed here fall back
// to a placeholder, so a new collection in the WMS renders without a deploy.
const COLLECTION_IMAGES: Record<string, string> = {
  "skwezed-freebase": "/images/skwezed_product_main.webp",
  "skwezed-30ml": "/images/skwezed_30ml_product_main.webp",
  "skwezed-ijoy": "/images/ijoy_product_main.webp",
};

const FALLBACK_IMAGE = "/images/skwezed_product_main.webp";

type Collection = {
  id: string;
  slug: string;
  name: string;
  productCount: number;
  featured: boolean;
  sortOrder: number;
};

export function CollectionShowcase({
  collections,
}: {
  collections: Collection[];
}) {
  if (!collections?.length) return null;

  const EXCLUDED_SLUGS = new Set(["merch", "skwezed-merch"]);
  const sorted = [...collections]
    .filter((c) => !EXCLUDED_SLUGS.has(c.slug))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  console.log("SHOWCASE: ", sorted);

  return (
    <section className="mb-16">
      <h2 className="mb-10 text-center text-3xl font-bold uppercase tracking-tight sm:text-4xl">
        The VPR Collection
      </h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {sorted.map((c) => (
          <Link
            key={c.id}
            href={`/collections/${c.slug}`}
            className="group block text-center"
          >
            <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden">
              <Image
                src={COLLECTION_IMAGES[c.slug] ?? FALLBACK_IMAGE}
                alt={c.name}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-contain transition duration-300 group-hover:scale-105"
              />
            </div>
            <p className="mt-4 text-lg font-medium text-foreground group-hover:underline">
              {c.name}
            </p>
            {c.productCount > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {c.productCount} products
              </p>
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}
