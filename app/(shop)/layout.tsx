import { getClient, tryGetAuthedClient } from "@/lib/wms/session";
import { CartProvider } from "@/components/cart-provider";
import { Header } from "@/components/header";
import Hero from "@/components/hero";
import AnnouceBar from "@/components/announceBar";
import { Footer } from "@/components/footer";

export const dynamic = "force-dynamic";

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
    getClient().getStore(),
    authed
      ? authed.getMe().catch(() => null) // expired token → treat as guest
      : Promise.resolve(null),
    getClient().getCollections(),
  ]);

  return (
    <CartProvider storeSlug={storeRes.store.slug}>
      <div className="flex min-h-screen flex-col">
        <AnnouceBar />
        <Header
          store={{
            name: storeRes.store.name,
            logoUrl: storeRes.store.logoUrl,
          }}
          customer={
            meRes
              ? { name: meRes.customer.name, email: meRes.customer.email }
              : null
          }
          collections={collectionsRes.collections}
        />
        {/* Hero */}

        <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
        <Footer />
      </div>
    </CartProvider>
  );
}
