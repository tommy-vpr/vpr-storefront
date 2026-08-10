import { CheckoutForm } from "./CheckoutForm";

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
 */

export const dynamic = "force-dynamic";

const SANDBOX_ACCEPT_JS = "https://jstest.authorize.net/v1/Accept.js";
const PRODUCTION_ACCEPT_JS = "https://js.authorize.net/v1/Accept.js";

export default function CheckoutPage() {
  const clientKey = process.env.NEXT_PUBLIC_ACCEPT_CLIENT_KEY ?? "";
  const loginId = process.env.NEXT_PUBLIC_ACCEPT_LOGIN_ID ?? "";

  // Default to SANDBOX. An unset flag in production means test transactions
  // that never settle, which someone notices; the reverse — defaulting to live
  // and getting real charges in a dev environment — is the one that hurts.
  const sandbox = process.env.NEXT_PUBLIC_ACCEPT_SANDBOX !== "false";
  const acceptJsUrl = sandbox ? SANDBOX_ACCEPT_JS : PRODUCTION_ACCEPT_JS;

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
      />
    </div>
  );
}
