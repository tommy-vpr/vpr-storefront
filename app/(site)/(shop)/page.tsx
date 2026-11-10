import { getClient } from "@/lib/wms/session";
import { BenefitsSection } from "@/components/benefitsSection";
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import { CollectionShowcase } from "@/components/collectionShowcase";
import { QuickLinks } from "@/components/quickLinks";
import Hero from "@/components/hero";
import { FullBleed } from "@/components/full-bleed";
import { getHomepage, DEFAULT_SHOWCASE_HIDDEN_SLUGS } from "@/lib/homepage";
import { getCollectionPresentation, presentCollections } from "@/lib/collection-presentation";

/** Site → Homepage drives every section; each falls back to the built-in content when empty. */
export default async function ShopHomePage() {
  const [collectionsRes, home, presentation] = await Promise.all([
    // A WMS blip costs the showcase, not the homepage.
    getClient().getCollections().catch((err) => { console.error("[home] getCollections failed", err); return null; }),
    getHomepage(),
    getCollectionPresentation(),
  ]);
  const collections = await presentCollections(collectionsRes?.collections ?? []);

  // Showcase rows reference Store → Collections by record id; the storefront works in slugs.
  const slugById = new Map([...presentation.values()].map((p) => [p.id, p.slug]));
  const imageBySlug: Record<string, string> = {};
  for (const [id, src] of Object.entries(home.showcase.imageByCollectionId)) {
    const slug = slugById.get(Number(id));
    if (slug) imageBySlug[slug] = src;
  }
  const hiddenSlugs = home.showcase.hiddenCollectionIds.length
    ? home.showcase.hiddenCollectionIds.map((id) => slugById.get(id)).filter((s): s is string => Boolean(s))
    : DEFAULT_SHOWCASE_HIDDEN_SLUGS;

  return (
    <>
      {home.hero.enabled && (
        <FullBleed className="mb-12">
          <Hero slides={home.hero.slides} />
        </FullBleed>
      )}

      <section className="container mx-auto flex-1 px-0 py-4 sm:px-4 sm:py-8">
        {home.benefits.enabled && (
          <div className="mb-12">
            <BenefitsSection items={home.benefits.items} />
          </div>
        )}

        {home.showcase.enabled && (
          <CollectionShowcase
            collections={collections}
            heading={home.showcase.heading}
            hiddenSlugs={hiddenSlugs}
            imageBySlug={imageBySlug}
            fallbackSrc={home.showcase.fallbackSrc}
          />
        )}

        {home.quickLinks.enabled && <QuickLinks items={home.quickLinks.items} />}

        {home.banners.enabled && home.banners.items.length > 0 && (
          <div className="my-24 rounded-2xl border bg-card overflow-hidden">
            <AnimatedTestimonials testimonials={home.banners.items} autoplay />
          </div>
        )}
      </section>
    </>
  );
}
