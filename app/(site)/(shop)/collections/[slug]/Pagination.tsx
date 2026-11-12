import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PageInfo } from "@/lib/wms/types";

/**
 * Page-based pagination driven entirely by the `page` search param.
 *
 * Uses links rather than client state so navigation re-runs the server
 * component and re-suspends the grid (see the Suspense key in page.tsx).
 * Swapping this for "Load More" or infinite scroll later means replacing this
 * file only — CollectionProducts already returns pageInfo.
 */
const base = buttonVariants({ variant: "outline", size: "sm" });
const linkClass = base;
const disabledClass = cn(base, "pointer-events-none opacity-50");

export function Pagination({
  page,
  pageInfo,
  searchParams = {},
}: {
  page: number;
  pageInfo: PageInfo;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const hasPrev = page > 1;
  const hasNext = pageInfo.hasNextPage;

  if (!hasPrev && !hasNext) return null;

  // Preserve sort/search/filters across page changes.
  const hrefFor = (target: number) => {
    const qs = new URLSearchParams();
    for (const [key, value] of Object.entries(searchParams)) {
      if (key === "page" || value === undefined) continue;
      for (const v of Array.isArray(value) ? value : [value]) qs.append(key, v);
    }
    if (target > 1) qs.set("page", String(target));
    const str = qs.toString();
    return str ? `?${str}` : "?";
  };

  return (
    <nav
      className="mt-10 flex items-center justify-center gap-3"
      aria-label="Pagination"
    >
      {hasPrev ? (
        <Link href={hrefFor(page - 1)} scroll className={linkClass}>
          Previous
        </Link>
      ) : (
        <span className={disabledClass}>Previous</span>
      )}

      <span className="text-sm text-muted-foreground">Page {page}</span>

      {hasNext ? (
        <Link href={hrefFor(page + 1)} scroll className={linkClass}>
          Next
        </Link>
      ) : (
        <span className={disabledClass}>Next</span>
      )}
    </nav>
  );
}
