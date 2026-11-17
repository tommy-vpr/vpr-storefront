import { Loader2 } from "lucide-react";

/**
 * Suspense fallback for the product grid only.
 *
 * Deliberately NOT the global loading.tsx: the header and toolbar are already
 * on screen by the time this shows, so it occupies just the product area.
 *
 * min-h keeps the footer from jumping up and then back down when products
 * resolve.
 */
export function ProductsSpinner() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-3 py-12"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">Loading products...</p>
    </div>
  );
}
