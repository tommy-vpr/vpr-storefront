"use client";

import { useEffect } from "react";

/**
 * Error boundary for the (shop) segment.
 *
 * Catches errors thrown by PAGES inside this segment. It does NOT catch
 * errors thrown by the segment's own layout — a layout renders outside its
 * own boundary, which is why app/(shop)/layout.tsx must never throw. See the
 * per-call .catch() handling there.
 *
 * Deliberately vague to the customer: a failed WMS call is our problem, not
 * something they can act on, and the specifics belong in logs rather than on
 * screen.
 */
export default function ShopError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface in the server logs / error reporting. `digest` is the only
    // handle we get on the server-side error in production.
    console.error("[shop] route error", { digest: error.digest, error });
  }, [error]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 py-16 text-center">
      <h2 className="text-2xl font-semibold tracking-tight">
        Something went wrong
      </h2>
      <p className="max-w-md text-muted-foreground">
        We couldn&apos;t load this page. This is usually temporary — please try
        again in a moment.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-2 rounded-md border border-input px-4 py-2 text-sm transition hover:bg-accent"
      >
        Try again
      </button>
      {error.digest ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Reference: {error.digest}
        </p>
      ) : null}
    </div>
  );
}
