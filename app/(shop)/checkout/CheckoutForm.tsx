"use client";

/**
 * Checkout form.
 *
 * Card data lives ONLY in this component's local state and goes straight to
 * Authorize.net via Accept.js. It is never sent to our server, never put in a
 * form action, and never logged. What comes back is a single-use nonce that
 * expires in ~15 minutes; that is the only payment value that crosses to the
 * server action.
 *
 * Accept.js refuses to run over http (E_WC_02), so local development needs an
 * https tunnel — the same one the WMS webhook points at.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/components/cart-provider";
import {
  AddressAutocomplete,
  type ResolvedAddress,
} from "@/components/address-autocomplete";
import { Turnstile, type TurnstileHandle } from "@/components/turnstile";
import { formatPrice } from "@/lib/format";
import { placeOrderAction } from "./actions";
import type { ShippingAddress } from "@/lib/wms/types";
import Image from "next/image";

declare global {
  interface Window {
    Accept?: {
      dispatchData: (
        data: unknown,
        handler: (response: AcceptResponse) => void,
      ) => void;
    };
  }
}

interface AcceptResponse {
  messages: {
    resultCode: string;
    message: Array<{ code: string; text: string }>;
  };
  opaqueData?: { dataDescriptor: string; dataValue: string };
}

const EMPTY_ADDRESS: ShippingAddress = {
  name: "",
  address1: "",
  address2: "",
  city: "",
  state: "",
  zip: "",
  country: "US",
  phone: "",
};

export function CheckoutForm({
  acceptJsUrl,
  clientKey,
  loginId,
  turnstileSiteKey,
  initialEmail,
  initialAddress,
}: {
  acceptJsUrl: string;
  clientKey: string;
  loginId: string;
  /** Empty when Turnstile isn't configured — the widget is then skipped. */
  turnstileSiteKey: string;
  /** The signed-in customer's email. Empty for a guest. */
  initialEmail: string;
  /** Saved profile address, when signed in with one. */
  initialAddress?: Partial<ShippingAddress>;
}) {
  const signedIn = initialEmail !== "";
  const router = useRouter();
  const { items, subtotal, isHydrated, clear } = useCart();

  const [acceptReady, setAcceptReady] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [shipping, setShipping] = useState<ShippingAddress>({
    ...EMPTY_ADDRESS,
    ...initialAddress,
  });
  const [billing, setBilling] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [billingSame, setBillingSame] = useState(true);
  const [card, setCard] = useState({
    number: "",
    month: "",
    year: "",
    cvv: "",
  });
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileHandle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scriptRequested = useRef(false);

  useEffect(() => {
    if (scriptRequested.current) return;
    scriptRequested.current = true;
    const s = document.createElement("script");
    s.src = acceptJsUrl;
    s.onload = () => setAcceptReady(true);
    s.onerror = () =>
      setError(
        "Card processing failed to load. Refresh the page, or contact us if it keeps happening.",
      );
    document.body.appendChild(s);
  }, [acceptJsUrl]);

  const setShip = (k: keyof ShippingAddress, v: string) =>
    setShipping((prev) => ({ ...prev, [k]: v }));
  const setBill = (k: keyof ShippingAddress, v: string) =>
    setBilling((prev) => ({ ...prev, [k]: v }));

  /**
   * Applied when a Places suggestion is chosen. Name and phone are the
   * customer's, not Google's, so they survive untouched.
   */
  const applyResolved =
    (set: (updater: (prev: ShippingAddress) => ShippingAddress) => void) =>
    (addr: ResolvedAddress) =>
      set((prev) => ({
        ...prev,
        address1: addr.address1,
        address2: addr.address2 || prev.address2,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        country: addr.country || "US",
      }));

  /** Tokenize with Accept.js. Resolves to the nonce, or rejects with a message. */
  const tokenize = () =>
    new Promise<{ dataDescriptor: string; dataValue: string }>(
      (resolve, reject) => {
        if (!window.Accept) {
          reject(new Error("Card processing isn't ready yet."));
          return;
        }
        window.Accept.dispatchData(
          {
            authData: { clientKey, apiLoginID: loginId },
            cardData: {
              cardNumber: card.number.replace(/\s/g, ""),
              month: card.month,
              year: card.year,
              cardCode: card.cvv,
              zip: (billingSame ? shipping : billing).zip,
            },
          },
          (response) => {
            if (response.messages.resultCode === "Error") {
              // These are card-shape complaints (bad number, expired date) —
              // safe and useful to show. A decline is a different thing and
              // comes back from the server action instead.
              reject(
                new Error(
                  response.messages.message.map((m) => m.text).join(" ") ||
                    "Please check your card details.",
                ),
              );
              return;
            }
            if (!response.opaqueData) {
              reject(new Error("Payment could not be processed."));
              return;
            }
            resolve(response.opaqueData);
          },
        );
      },
    );

  const handleSubmit = async () => {
    setError(null);

    if (!email.trim()) return setError("Enter an email for your receipt.");
    if (
      !shipping.name.trim() ||
      !shipping.address1.trim() ||
      !shipping.city.trim() ||
      !shipping.state.trim() ||
      !shipping.zip.trim()
    ) {
      return setError("Complete the shipping address.");
    }
    if (items.length === 0) return setError("Your cart is empty.");

    // Checked BEFORE tokenizing. A card nonce is single-use, so failing the
    // bot check after tokenizing would spend it and force the customer to
    // re-enter their card for a problem that has nothing to do with it.
    if (turnstileSiteKey && !turnstileToken) {
      return setError(
        "Still verifying you're human — give it a second and try again.",
      );
    }

    setSubmitting(true);
    try {
      // Tokenize FIRST. If the card is malformed we never reach the server, so
      // no order is created and nothing needs rolling back.
      const opaqueData = await tokenize();

      const result = await placeOrderAction({
        email: email.trim(),
        items: items.map((i) => ({
          variantId: i.variantId,
          quantity: i.quantity,
        })),
        shippingAddress: shipping,
        billingAddress: billingSame ? undefined : billing,
        opaqueData,
        turnstileToken,
        // Names only, so the receipt reads like the cart did. Amounts on the
        // receipt come from the WMS, not from here.
        displayNames: Object.fromEntries(
          items.map((i) => [
            i.variantId,
            i.variantName ? `${i.name} — ${i.variantName}` : i.name,
          ]),
        ),
      });

      if (!result.ok) {
        setError(result.message);
        // Turnstile tokens are single-use, so a retry needs a fresh one —
        // resending the rejected token would fail identically.
        turnstileRef.current?.reset();
        // The nonce is spent whether or not the charge succeeded, so a retry
        // has to re-tokenize. Clearing the number makes that unavoidable
        // rather than a silent second failure.
        setCard((c) => ({ ...c, number: "", cvv: "" }));
        setSubmitting(false);
        return;
      }

      // Order is placed and authorized. Empty the cart before navigating so a
      // back-button press can't resubmit it.
      clear();
      router.push(
        result.token
          ? `/orders/${result.token}`
          : `/orders/lookup?placed=${encodeURIComponent(result.orderNumber)}`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  };

  if (!isHydrated) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <Button asChild className="mt-6">
          <Link href="/all-collections">Browse collections</Link>
        </Button>
      </div>
    );
  }

  const addressFields = (
    value: ShippingAddress,
    set: (k: keyof ShippingAddress, v: string) => void,
    prefix: string,
    onResolved: (addr: ResolvedAddress) => void,
  ) => (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-name`}>Full name</Label>
        <Input
          id={`${prefix}-name`}
          value={value.name}
          onChange={(e) => set("name", e.target.value)}
          autoComplete="name"
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-address1`}>Address</Label>
        <AddressAutocomplete
          id={`${prefix}-address1`}
          value={value.address1}
          onChange={(v) => set("address1", v)}
          onResolved={onResolved}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-address2`}>
          Apartment, suite (optional)
        </Label>
        <Input
          id={`${prefix}-address2`}
          value={value.address2 ?? ""}
          onChange={(e) => set("address2", e.target.value)}
          autoComplete="address-line2"
        />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefix}-city`}>City</Label>
          <Input
            id={`${prefix}-city`}
            value={value.city}
            onChange={(e) => set("city", e.target.value)}
            autoComplete="address-level2"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefix}-state`}>State</Label>
          <Input
            id={`${prefix}-state`}
            value={value.state}
            onChange={(e) => set("state", e.target.value)}
            autoComplete="address-level1"
            maxLength={2}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`${prefix}-zip`}>ZIP</Label>
          <Input
            id={`${prefix}-zip`}
            value={value.zip}
            onChange={(e) => set("zip", e.target.value)}
            autoComplete="postal-code"
          />
        </div>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`${prefix}-phone`}>Phone (optional)</Label>
        <Input
          id={`${prefix}-phone`}
          value={value.phone ?? ""}
          onChange={(e) => set("phone", e.target.value)}
          autoComplete="tel"
        />
      </div>
    </div>
  );

  return (
    <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_360px]">
      <div className="space-y-8">
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Contact</h2>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              // Locked when signed in: the WMS takes the token's email as
              // authoritative and ignores whatever the body says, so an
              // editable box here would be a lie — they'd type a new address
              // and the receipt would still go to the account's.
              readOnly={signedIn}
              disabled={signedIn}
            />
            <p className="text-xs text-muted-foreground">
              {signedIn
                ? "Sent to your account email. Change it in your account settings."
                : "Your receipt and tracking updates go here."}
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Shipping address</h2>
          {addressFields(shipping, setShip, "ship", applyResolved(setShipping))}
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              id="billing-same"
              type="checkbox"
              checked={billingSame}
              onChange={(e) => setBillingSame(e.target.checked)}
              className="h-4 w-4"
            />
            <Label htmlFor="billing-same" className="font-normal">
              Billing address is the same as shipping
            </Label>
          </div>
          {!billingSame && (
            <>
              <h2 className="text-lg font-medium">Billing address</h2>
              {addressFields(
                billing,
                setBill,
                "bill",
                applyResolved(setBilling),
              )}
            </>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Payment</h2>

          <Image
            src="/images/payment_methods.webp"
            width={480}
            height={280}
            alt="payment methods"
            quality={100}
            className="w-[240px] h-auto"
          />

          <div className="grid gap-1.5">
            <Label htmlFor="card-number">Card number</Label>
            <Input
              id="card-number"
              inputMode="numeric"
              autoComplete="cc-number"
              value={card.number}
              onChange={(e) => setCard({ ...card, number: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="card-month">MM</Label>
              <Input
                id="card-month"
                inputMode="numeric"
                autoComplete="cc-exp-month"
                maxLength={2}
                value={card.month}
                onChange={(e) => setCard({ ...card, month: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="card-year">YYYY</Label>
              <Input
                id="card-year"
                inputMode="numeric"
                autoComplete="cc-exp-year"
                maxLength={4}
                value={card.year}
                onChange={(e) => setCard({ ...card, year: e.target.value })}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="card-cvv">CVV</Label>
              <Input
                id="card-cvv"
                inputMode="numeric"
                autoComplete="cc-csc"
                maxLength={4}
                value={card.cvv}
                onChange={(e) => setCard({ ...card, cvv: e.target.value })}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Card details go directly to our payment processor and never touch
            our servers.
          </p>
        </section>
      </div>

      <aside className="h-fit rounded-lg border bg-card p-5 lg:sticky lg:top-6">
        <h2 className="mb-4 text-lg font-medium">Order summary</h2>
        <div className="space-y-3">
          {items.map((i) => (
            <div
              key={i.variantId}
              className="flex justify-between gap-3 text-sm"
            >
              <span className="min-w-0">
                <span className="line-clamp-1">{i.name}</span>
                <span className="text-xs text-muted-foreground">
                  {i.variantName} · {i.quantity}
                </span>
              </span>
              <span className="shrink-0">
                {formatPrice(i.price * i.quantity)}
              </span>
            </div>
          ))}
        </div>

        <Separator className="my-4" />

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Shipping</span>
            <span>Calculated at fulfillment</span>
          </div>
          <Separator />
          <div className="flex justify-between text-base font-medium">
            <span>Total</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
        </div>

        {turnstileSiteKey && (
          <Turnstile
            siteKey={turnstileSiteKey}
            onToken={setTurnstileToken}
            handleRef={turnstileRef}
            onError={() =>
              setError(
                "Verification failed to load. Refresh the page and try again.",
              )
            }
          />
        )}

        {error && (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}

        <Button
          className="mt-5 w-full hover:bg-primary/90 transition"
          size="lg"
          disabled={!acceptReady || submitting}
          onClick={handleSubmit}
        >
          {submitting
            ? "Placing order…"
            : acceptReady
              ? `Pay ${formatPrice(subtotal)}`
              : "Loading…"}
        </Button>

        <p className="mt-3 text-xs text-muted-foreground">
          Your card is authorized now and charged when your order ships. If
          something can&apos;t ship, the hold is released.
        </p>
      </aside>
    </div>
  );
}
