import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getClient, isLoggedIn } from "@/lib/wms/session";
import { CollectionCard } from "@/components/collection-card";
import { BenefitsSection } from "@/components/benefitsSection";
import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import { CollectionShowcase } from "@/components/collectionShowcase";
import { QuickLinks } from "@/components/quickLinks";
import Hero from "@/components/hero";

const TESTIMONIALS = [
  {
    quote:
      "VPR Collection has been our go-to for wholesale for two years. Fast shipping, real prices, and the support team actually picks up.",
    name: "Skwezed",
    designation: "Tastes Just Like It!",
    src: "/images/skwezed_banner_main.webp",
    bgColor: "bg-green-500",
  },
  {
    quote:
      "The pricing structure is transparent and the 90-day buy back policy has saved us from being stuck with slow-moving SKUs.",
    name: "iJoy x Skwezed",
    designation: "Buyer, Vape District",
    src: "/images/ijoy_banner_main.webp",
    bgColor: "bg-orange-400",
  },
  {
    quote:
      "Free shipping on every order makes a real difference on our margins. Haven't found another wholesale partner that does it.",
    name: "Blankers",
    designation: "Blanker x Skwezed",
    src: "/images/blanker_banner_main.webp",
    bgColor: "bg-[#101010]",
    darkBg: true,
  },
];

export default async function ShopHomePage() {
  const [{ store }, { collections }, loggedIn] = await Promise.all([
    getClient().getStore(),
    getClient().getCollections(),
    isLoggedIn(),
  ]);

  // console.log("[WMS] url:", process.env.WMS_API_URL);
  // console.log("[WMS] key tail:", process.env.WMS_API_KEY?.slice(-6));
  // console.log("[WMS] key len:", process.env.WMS_API_KEY?.length);
  console.log("MAIN: ", collections);

  return (
    <>
      {/* Hero */}
      {/* <section className="mb-12 flex flex-col items-center justify-center rounded-2xl border bg-card px-6 py-16 text-center sm:py-24">
        {store.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={store.logoUrl}
            alt={store.name}
            className="mb-6 h-16 w-auto"
          />
        ) : null}
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {store.name}
        </h1>
        <p className="mt-4 max-w-lg text-balance text-muted-foreground">
          Wholesale catalog. Browse our collections below — sign in to see
          pricing and place orders.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href="#collections">Shop now</Link>
          </Button>
          {!loggedIn && (
            <Button asChild variant="outline" size="lg">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </section> */}

      <Hero />

      <section className="container mx-auto flex-1 px-4 py-8">
        {/* Benefits */}
        <div className="mb-12">
          <BenefitsSection />
        </div>

        {/* Collection grid */}
        <CollectionShowcase collections={collections} />

        {/* Collection grid */}
        <QuickLinks />

        {/* Mid section callouts */}
        <div className="my-24 rounded-2xl border bg-card overflow-hidden">
          <AnimatedTestimonials testimonials={TESTIMONIALS} autoplay />
        </div>
      </section>

      {/* Collection grid */}
      {/* <section id="collections">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Collections</h2>
        </div>

        {collections.length === 0 ? (
          <p className="py-12 text-center text-muted-foreground">
            No collections available yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </div>
        )}
      </section> */}
    </>
  );
}
