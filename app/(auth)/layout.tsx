/**
 * Layout for all auth-related pages (/login, /accept-invite, /forgot-password,
 * /reset-password). Renders the store's brand header above a card container.
 * Each child page just supplies its own CardHeader + CardContent.
 */

import { getClient } from "@/lib/wms/session";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let storeName = "Storefront";
  let logoUrl: string | null = null;

  try {
    const { store } = await getClient().getStore();
    storeName = store.name;
    logoUrl = store.logoUrl;
  } catch {
    // If the WMS isn't reachable we still want the page to render —
    // auth actions will surface the real error.
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="mb-8 flex flex-col items-center">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoUrl}
            alt={storeName}
            className="h-10 w-auto"
          />
        ) : (
          <h1 className="text-2xl font-semibold tracking-tight">
            {storeName}
          </h1>
        )}
      </div>

      <Card className="w-full max-w-md">{children}</Card>
    </div>
  );
}
