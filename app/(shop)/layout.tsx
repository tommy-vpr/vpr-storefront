import { getClient, tryGetAuthedClient } from "@/lib/wms/session";
import { CartProvider } from "@/components/cart-provider";
import { Header } from "@/components/header";
import AnnouceBar from "@/components/announceBar";
import { Footer } from "@/components/footer";
import WarningLabel from "@/components/warningLabel";
import { getSiteSettings, DEFAULT_HEADER_HIDDEN_SLUGS } from "@/lib/site-settings";
import { getCollectionPresentation, presentCollections } from "@/lib/collection-presentation";
import { getNavigation } from "@/lib/navigation";

export const dynamic = "force-dynamic";

/**
 * Branding shown when the WMS can't be reached.
 *
 * A layout renders OUTSIDE its own error boundary — app/(shop)/error.tsx
 * catches errors thrown by PAGES in this segment, not by this file. If this
 * layout throws there is nothing above it to catch, so the entire site 500s,
 * including static pages like /terms that need no WMS data at all.
 *
 * Every WMS call below is therefore caught individually and degraded. A blip
 * costs the brand nav, not the site.
 *
 * Deliberately no slug: the cart's localStorage key is a client-side constant
 * (see components/cart-provider.tsx) precisely so a fallback here can't change
 * it and orphan carts.
 */
const FALLBACK_STORE = {
  name: process.env.NEXT_PUBLIC_STORE_NAME || "Store",
  logoUrl: null as string | null,
};

export default async function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Store info is public — always fetch it for branding.
  // Customer is optional — present only if there's a valid session.
  // Collections feed the nav brand menus.
  const authed = await tryGetAuthedClient();
  const [storeRes, meRes, collectionsRes, site, presentation] = await Promise.all([
    getClient()
      .getStore()
      .catch((err) => {
        console.error("[shop/layout] getStore failed", err);
        return null;
      }),
    authed
      ? authed.getMe().catch(() => null) // expired token → treat as guest
      : Promise.resolve(null),
    getClient()
      .getCollections()
      .catch((err) => {
        console.error("[shop/layout] getCollections failed", err);
        return null;
      }),
    getSiteSettings(),
    getCollectionPresentation(),
  ]);

  const store = storeRes?.store ?? FALLBACK_STORE;
  // Store → Collections: hidden / renamed / reordered in the CMS; menu-only ones feed the nav.
  const collections = await presentCollections(collectionsRes?.collections ?? [], { menuOnly: true });
  // Site settings → Header lists collections to keep out of the brand menus (by record id → slug).
  const hiddenSlugs = site.headerHiddenCollectionIds.length
    ? [...presentation.values()].filter((p) => site.headerHiddenCollectionIds.includes(p.id)).map((p) => p.slug)
    : DEFAULT_HEADER_HIDDEN_SLUGS;
  // Site → Navigation, or the built-in menu (brand menus + Site settings header links) while it is empty.
  const menu = await getNavigation({
    collections,
    slugById: new Map([...presentation.values()].map((p) => [p.id, p.slug])),
    brandHiddenSlugs: hiddenSlugs,
    fallbackLinks: site.headerLinks,
  });

  return (
    <CartProvider storeSlug={storeRes?.store.slug}>
      <div className="flex min-h-screen flex-col">
        <WarningLabel enabled={site.warning.enabled} line1={site.warning.line1} line2={site.warning.line2} />
        <AnnouceBar enabled={site.announcement.enabled} text={site.announcement.text} href={site.announcement.href} />
        <Header
          logo={site.logo}
          menu={menu}
          store={{
            name: store.name,
            logoUrl: store.logoUrl,
          }}
          customer={
            meRes
              ? { name: meRes.customer.name, email: meRes.customer.email }
              : null
          }
          showQuickOrder={Boolean(meRes && (meRes.customer.wholesaleAccount ?? storeRes?.store.mode === "WHOLESALE"))}
        />
        <main className="container mx-auto px-4 mb-12">{children}</main>
        <Footer settings={site} />
      </div>
    </CartProvider>
  );
}
