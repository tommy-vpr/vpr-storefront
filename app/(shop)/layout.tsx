import { getClient, tryGetAuthedClient } from "@/lib/wms/session";
import { CartProvider } from "@/components/cart-provider";
import { Header } from "@/components/header";
import Hero from "@/components/hero";
import AnnouceBar from "@/components/announceBar";
import { Footer } from "@/components/footer";
import WarningLabel from "@/components/warningLabel";

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
  const [storeRes, meRes, collectionsRes] = await Promise.all([
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
  ]);

  const store = storeRes?.store ?? FALLBACK_STORE;
  const collections = collectionsRes?.collections ?? [];

  return (
    <CartProvider storeSlug={storeRes?.store.slug}>
      <div className="flex min-h-screen flex-col">
        <WarningLabel />
        <AnnouceBar />
        <Header
          store={{
            name: store.name,
            logoUrl: store.logoUrl,
          }}
          customer={
            meRes
              ? { name: meRes.customer.name, email: meRes.customer.email }
              : null
          }
          collections={collections}
        />
        {/* Hero */}

        <main className="container mx-auto py-12 px-4">{children}</main>
        <Footer />
      </div>
    </CartProvider>
  );
}
