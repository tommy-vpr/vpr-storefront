import Image from "next/image";

/**
 * Full-bleed banner at the top of a collection page.
 *
 * Renders nothing without an image. A collection with no banner gets the plain
 * heading it had before rather than a grey box or a stretched product shot —
 * an empty 30vh band is worse than no band.
 *
 * The title sits ON the image so the banner replaces the heading rather than
 * pushing it down; a 30vh image followed by a separate title costs most of a
 * phone screen before the first product.
 */
export function CollectionBanner({
  name,
  description,
  imageUrl,
}: {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
}) {
  if (!imageUrl) return null;

  return (
    <div className="relative h-[30vh] min-h-[180px] w-full overflow-hidden bg-gray-200 ">
      <Image
        src={imageUrl}
        alt={name}
        fill
        // Full-bleed, so it's always the viewport width — telling Next that
        // avoids it serving an image sized for a container it never sits in.
        sizes="100vw"
        // Above the fold by definition, so it should not lazy-load.
        priority
        className="object-cover"
      />

      <div className="absolute left-1/2 top-1/2 -translate-y-1/2 -translate-x-1/2 bottom-0 p-6 sm:p-10">
        <div className="container mx-auto p-4 bg-black/30 rounded">
          <h1 className="text-xl lg:text-3xl font-semibold capitalize tracking-wide text-white drop-shadow-sm">
            {name}
          </h1>
          {description && (
            <p className="mt-2 max-w-2xl text-sm text-white/80 sm:text-base">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
