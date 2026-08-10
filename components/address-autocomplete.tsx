"use client";

/**
 * Address line 1 with Google Places suggestions.
 *
 * Degrades to a plain text input on ANY failure — no key configured, Google
 * down, network blip. Suggestions are a convenience; typing an address by hand
 * must always work, because the alternative is a checkout that can't be
 * completed.
 *
 * COST SHAPE: Google bills a Places session as the keystrokes plus the one
 * details call that closes it. So one token is minted per address the customer
 * enters, reused across every keystroke, and replaced as soon as a suggestion
 * is chosen. Combined with the 300ms debounce and the 4-character floor on the
 * server, a typical address costs one session rather than one per letter.
 */

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

export interface ResolvedAddress {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
}

interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

const DEBOUNCE_MS = 300;

function newSessionToken(): string {
  // crypto.randomUUID needs a secure context — which Accept.js already forces
  // on this page anyway. The fallback keeps dev over plain http usable.
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return "00000000-0000-4000-8000-" + Date.now().toString(16).padStart(12, "0");
}

export function AddressAutocomplete({
  id,
  value,
  onChange,
  onResolved,
  autoComplete = "address-line1",
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  /** Fired when the customer picks a suggestion — fills the sibling fields. */
  onResolved: (addr: ResolvedAddress) => void;
  autoComplete?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const sessionToken = useRef(newSessionToken());
  const boxRef = useRef<HTMLDivElement>(null);
  // Set while applying a selection, so the resulting value change doesn't
  // immediately re-query and reopen the list.
  const applying = useRef(false);

  // Close on an outside click. Without this the list survives a click into the
  // next field and covers it.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (applying.current) {
      applying.current = false;
      return;
    }
    if (value.trim().length < 4) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/places/autocomplete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: value,
            sessionToken: sessionToken.current,
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          setSuggestions([]);
          setOpen(false);
          return;
        }
        const data = (await res.json()) as { suggestions?: Suggestion[] };
        setSuggestions(data.suggestions ?? []);
        setOpen((data.suggestions ?? []).length > 0);
      } catch {
        // Aborted or offline — stay quiet and let them type.
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  const select = async (s: Suggestion) => {
    setOpen(false);
    applying.current = true;
    onChange(s.mainText);

    try {
      const res = await fetch("/api/places/details", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeId: s.placeId,
          sessionToken: sessionToken.current,
        }),
      });
      if (res.ok) {
        const addr = (await res.json()) as ResolvedAddress;
        // address1 can come back empty for a place with no street number —
        // keep what they picked rather than blanking the field.
        onResolved({ ...addr, address1: addr.address1 || s.mainText });
      }
    } catch {
      // Keep the typed line; the rest stays manual.
    } finally {
      // The session ended with that details call — the next address starts a
      // new billable one.
      sessionToken.current = newSessionToken();
    }
  };

  return (
    <div ref={boxRef} className="relative">
      <Input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        autoComplete={autoComplete}
      />
      {loading && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
          …
        </span>
      )}
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
          {suggestions.map((s) => (
            <li key={s.placeId}>
              <button
                type="button"
                onClick={() => select(s)}
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span>{s.mainText}</span>
                {s.secondaryText && (
                  <span className="text-xs text-muted-foreground">
                    {s.secondaryText}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
