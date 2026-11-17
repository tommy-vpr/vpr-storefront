/**
 * Route-level loading UI.
 *
 * Shown only while navigating *to* a collection route, before any of the
 * page's own server components have flushed. Once the shell streams in,
 * ProductsSpinner takes over for the product area.
 *
 * Skeleton rather than a spinner, so the transition into the real header
 * doesn't visibly swap loading indicators.
 */
export default function Loading() {
  return (
    <>
      <div className="mb-8">
        <div className="mb-4 h-8 w-32 animate-pulse rounded bg-muted" />
        <div className="h-9 w-64 animate-pulse rounded bg-muted" />
        <div className="mt-3 h-5 w-96 max-w-full animate-pulse rounded bg-muted" />
        <div className="mt-3 h-4 w-24 animate-pulse rounded bg-muted" />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </>
  );
}
