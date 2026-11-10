import Image from "next/image";
import Link from "next/link";

import { DEFAULT_SHOWCASE_IMAGES } from "@/lib/homepage";

type Collection = {
  id: string;
  slug: string;
  name: string;
  productCount: number;
  featured: boolean;
  sortOrder: number;
};

/**
 * Site → Homepage → Collection showcase. `imageBySlug` comes from the CMS rows; slugs
 * without one use the built-in map, then `fallbackSrc`.
 */
export function CollectionShowcase({
  collections,
  heading,
  hiddenSlugs,
  imageBySlug,
  fallbackSrc,
}: {
  collections: Collection[];
  heading: string;
  hiddenSlugs: string[];
  imageBySlug: Record<string, string>;
  fallbackSrc: string;
}) {
  if (!collections?.length) return null;
  const excluded = new Set(hiddenSlugs);
  const sorted = [...collections]
    .filter((c) => !excluded.has(c.slug))
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (!sorted.length) return null;

  return (
    <section className="mb-16">
      <h2 className="mb-10 text-center text-3xl font-bold uppercase tracking-tight sm:text-4xl">
        {heading}
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
                src={imageBySlug[c.slug] ?? DEFAULT_SHOWCASE_IMAGES[c.slug] ?? fallbackSrc}
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
