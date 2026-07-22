import Image from "next/image";
import Link from "next/link";

// Edit these to customize the quick-link tiles shown on the home page.
const LINKS: {
  label: string;
  src: string;
  href: string;
}[] = [
  {
    label: "Quick Order",
    src: "/images/ql_quick_order.webp",
    href: "/quick-order",
  },
  {
    label: "Sample Request",
    src: "/images/ql_sample_request.webp",
    href: "/sample-request",
  },
  {
    label: "Wholesale",
    src: "/images/ql_wholesale.webp",
    href: "/wholesale-application",
  },
];

export function QuickLinks() {
  return (
    <section className="my-24 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {LINKS.map((link) => (
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
