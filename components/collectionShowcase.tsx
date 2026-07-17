import Image from "next/image";
import Link from "next/link";

// Edit these to customize the collection cards shown on the home page.
const COLLECTIONS: {
  name: string;
  src: string;
  href: string;
}[] = [
  {
    name: "Skwezed Freebase",
    src: "/images/skwezed_product_main.webp",
    href: "/collections/skwezed-freebase",
  },
  {
    name: "Skwezed Salts",
    src: "/images/skwezed_30ml_product_main.webp",
    href: "/collections/skwezed-salts",
  },
  {
    name: "Skwezed x iJoy",
    src: "/images/ijoy_product_main.webp",
    href: "/collections/skwezed-ijoy",
  },
];

export function CollectionShowcase() {
  return (
    <section className="mb-16">
      <h2 className="mb-10 text-center text-3xl font-bold uppercase tracking-tight sm:text-4xl">
        The VPR Collection
      </h2>
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {COLLECTIONS.map((c) => (
          <Link key={c.name} href={c.href} className="group block text-center">
            <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden">
              <Image
                src={c.src}
                alt={c.name}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-contain transition duration-300 group-hover:scale-105"
              />
            </div>
            <p className="mt-4 text-lg font-medium text-foreground group-hover:underline">
              {c.name}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
