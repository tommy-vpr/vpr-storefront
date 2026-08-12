import Link from "next/link";
import { ChevronRight } from "lucide-react";

/**
 * Breadcrumbs.
 *
 * Replaces the pair of hand-rolled "Back" buttons that both pointed at "/" —
 * neither of which was where the customer came from. From a collection, "All
 * collections" went to the homepage; from a product, "Back" did too, skipping
 * the collection they were actually browsing.
 *
 * A trail is more honest than a back button: it says where you are rather than
 * guessing where you were, and it survives someone arriving from a link or a
 * search result with no history to go back to.
 *
 * The last crumb is the current page and is deliberately not a link — a link
 * to the page you're on is a small lie about what will happen.
 */

export interface Crumb {
  label: string;
  /** Omit on the final crumb. */
  href?: string;
}

export function Breadcrumbs({
  items,
  className = "",
}: {
  items: Crumb[];
  className?: string;
}) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={`mb-6 ${className}`}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-1">
              {i > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 shrink-0 opacity-50"
                  aria-hidden
                />
              )}
              {isLast || !item.href ? (
                <span
                  className="max-w-[240px] truncate text-foreground"
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.label}
                </span>
              ) : (
                <Link
                  href={item.href}
                  className="max-w-[200px] truncate transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
