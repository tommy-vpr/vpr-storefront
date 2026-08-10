"use client";

/**
 * Cloudflare Turnstile.
 *
 * Checkout is an unauthenticated endpoint that authorizes cards, which is
 * exactly what card-testing bots scan for: they run stolen numbers in bulk to
 * find which still work. Every attempt is a real gateway call, and a flood of
 * declines damages the merchant account's standing — which bites harder here
 * because each brand has its own MID.
 *
 * Rendered EXPLICITLY rather than via the auto-scan, so React owns when the
 * widget appears and we hold the widget id needed to reset it. A token is
 * single-use and expires in ~5 minutes, so a failed submit must reset the
 * widget or the retry sends a token the server has already seen.
 */

import { useEffect, useRef } from "react";

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "error-callback"?: () => void;
      "expired-callback"?: () => void;
      appearance?: "always" | "execute" | "interaction-only";
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
    onloadTurnstileCallback?: () => void;
  }
}

let scriptPromise: Promise<void> | null = null;

/** One script tag per page, however many components ask for it. */
function loadScript(): Promise<void> {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.turnstile) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Turnstile failed to load"));
    document.head.appendChild(s);
  });
  return scriptPromise;
}

export interface TurnstileHandle {
  reset: () => void;
}

export function Turnstile({
  siteKey,
  onToken,
  onError,
  handleRef,
}: {
  siteKey: string;
  onToken: (token: string | null) => void;
  onError?: () => void;
  /** Filled with a reset() the parent calls after a failed submit. */
  handleRef?: { current: TurnstileHandle | null };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Guarded on the WIDGET ID, not a mount flag, and with no cancellation.
    //
    // React 19 StrictMode double-invokes effects in dev. A mount flag plus a
    // cancel-on-cleanup meant: first run sets the flag and starts loading,
    // cleanup cancels it, second run returns early because the flag is set,
    // and the resolved script then bails on the cancelled flag. Nothing ever
    // rendered, and nothing errored either — an empty div and a silent
    // failure. Checking the widget id instead makes the second run a genuine
    // no-op only once a widget actually exists.
    loadScript()
      .then(() => {
        if (widgetIdRef.current) return;
        if (!containerRef.current || !window.turnstile) return;

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => onToken(token),
          // A token that expires while the customer is still filling the form
          // must clear, or submit sends a stale one the server will reject.
          "expired-callback": () => onToken(null),
          "error-callback": () => {
            onToken(null);
            onError?.();
          },
          appearance: "interaction-only",
          theme: "auto",
        });

        if (handleRef) {
          handleRef.current = {
            reset: () => {
              onToken(null);
              window.turnstile?.reset(widgetIdRef.current ?? undefined);
            },
          };
        }
      })
      .catch(() => {
        onToken(null);
        onError?.();
      });

    // No cleanup that removes the widget: in StrictMode the teardown would
    // run between the two dev invocations and destroy the widget the second
    // one is about to skip creating. The widget lives as long as the page.
    // Intentionally mount-only: re-rendering it would invalidate the token
    // the customer already earned.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className="my-2" />;
}
