import Image from "next/image";
import Link from "next/link";

import type { QuickLinkTile } from "@/lib/homepage-defaults";

/** Site → Homepage → Quick links. */
export function QuickLinks({ items }: { items: QuickLinkTile[] }) {
  if (!items.length) return null;
  return (
    <section className="my-24 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((link) => (
        <Link
          key={link.label}
          href={link.href}
          className="group relative block overflow-hidden rounded-xl"
        >
          <div className="relative aspect-[16/10] w-full">
            <Image
              src={link.src}
              alt={link.label}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-[#101010] py-4 text-center">
            <span className="text-lg font-medium text-white">{link.label}</span>
          </div>
        </Link>
      ))}
    </section>
  );
}
