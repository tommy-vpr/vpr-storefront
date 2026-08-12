import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getCatalogClient, getClient, isLoggedIn } from "@/lib/wms/session";
import { QuickOrderTable } from "./QuickOrderTable";

/**
 * Quick order — bulk reorder for wholesale buyers who already know what they
 * want and are here to enter quantities, not to browse.
 *
 * Signed-in only. Prices are per-account on a wholesale store, so an
 * anonymous version would be a bulk-entry screen with no prices — and the
 * prices are the entire reason a buyer uses this instead of the catalogue.
 * The API enforces the same rule.
 */

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function QuickOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; collection?: string; page?: string }>;
}) {
  const { q, collection, page } = await searchParams;

  const [{ store }, loggedIn] = await Promise.all([
    getClient().getStore(),
    isLoggedIn(),
  ]);

  if (store.mode === "WHOLESALE" && !loggedIn) {
    redirect("/login?redirect=/quick-order");
  }

  const pageNum = Math.max(1, Number(page) || 1);
  const client = await getCatalogClient();

  const [{ variants, total }, { collections }] = await Promise.all([
    client.quickOrder({
      q,
      collectionId: collection,
      skip: (pageNum - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    client.getCollections(),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mt-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Quick order</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Enter quantities across as many pages as you like — everything goes
            to one cart.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/cart">View cart</Link>
        </Button>
      </div>

      <QuickOrderTable
        variants={variants}
        collections={collections.map((c) => ({ id: c.id, name: c.name }))}
        total={total}
        page={pageNum}
        totalPages={totalPages}
        initialQuery={q ?? ""}
        initialCollection={collection ?? ""}
      />
    </div>
  );
}
