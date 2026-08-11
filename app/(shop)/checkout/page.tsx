import { CheckoutForm } from "./CheckoutForm";
import { tryGetAuthedClient } from "@/lib/wms/session";
import type { ShippingAddress } from "@/lib/wms/types";

/**
 * Checkout.
 *
 * The cart lives in localStorage, so the whole thing is client-rendered; this
 * page exists to hand down the Accept.js configuration and to keep the API key
 * out of the client bundle by never touching it here.
 *
 * The client key and API login ID are BOTH public by design — Accept.js needs
 * them in the browser, and neither can move money on its own. The transaction
 * key, which can, lives encrypted on the WMS Store row and is never exposed to
 * this app at all.
 *
 * For a signed-in customer it also prefills the form from their saved profile.
 * The read happens HERE rather than in the client component so the JWT never
 * leaves the server, and it degrades to an empty form on any failure — a
 * profile lookup must never be able to block a purchase.
 */

export const dynamic = "force-dynamic";

const SANDBOX_ACCEPT_JS = "https://jstest.authorize.net/v1/Accept.js";
const PRODUCTION_ACCEPT_JS = "https://js.authorize.net/v1/Accept.js";

export default async function CheckoutPage() {
  const clientKey = process.env.NEXT_PUBLIC_ACCEPT_CLIENT_KEY ?? "";
  const loginId = process.env.NEXT_PUBLIC_ACCEPT_LOGIN_ID ?? "";

  // Default to SANDBOX. An unset flag in production means test transactions
  // that never settle, which someone notices; the reverse — defaulting to live
  // and getting real charges in a dev environment — is the one that hurts.
  const sandbox = process.env.NEXT_PUBLIC_ACCEPT_SANDBOX !== "false";
  const acceptJsUrl = sandbox ? SANDBOX_ACCEPT_JS : PRODUCTION_ACCEPT_JS;

  // Prefill for a signed-in customer. Wrapped because an expired JWT only
  // fails at the WMS, and the right outcome then is an empty form, not an
  // error page between a customer and their order.
  let initialEmail = "";
  let initialAddress: Partial<ShippingAddress> | undefined;
  try {
    const client = await tryGetAuthedClient();
    if (client) {
      const { customer } = await client.getMe();
      initialEmail = customer.email;
      initialAddress = {
        name: customer.name ?? "",
        address1: customer.addressLine1 ?? "",
        address2: customer.addressLine2 ?? "",
        city: customer.city ?? "",
        state: customer.state ?? "",
        zip: customer.zip ?? "",
        country: customer.countryCode ?? "US",
        phone: customer.phone ?? "",
      };
    }
  } catch {
    // Signed out, expired, or the WMS is unhappy — fall through to a blank
    // form. Checkout still works; they just type it themselves.
  }

  if (!clientKey || !loginId) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <h1 className="text-2xl font-semibold">Checkout is unavailable</h1>
        <p className="mt-2 text-muted-foreground">
          Payment isn&apos;t configured for this store yet. Please contact us to
          place your order.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Checkout</h1>
      <CheckoutForm
        acceptJsUrl={acceptJsUrl}
        clientKey={clientKey}
        loginId={loginId}
        turnstileSiteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""}
        initialEmail={initialEmail}
        initialAddress={initialAddress}
      />
    </div>
  );
}
