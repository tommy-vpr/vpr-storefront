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
    <div className="relative h-[30vh] min-h-[180px] w-full overflow-hidden">
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

      {/* Gradient rather than a flat overlay: the bottom needs to be dark
          enough for text while the top stays as photographed. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/10" />

      <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
        <div className="container mx-auto">
          <h1 className="text-3xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-4xl">
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
