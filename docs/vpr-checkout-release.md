# VPR wholesale checkout release

## Scope and branch base

VPR is wholesale-only, invitation-only, with free shipping on every order, including international orders as confirmed by the owner. Public catalog browsing is unchanged. This checkout branch starts from feat/payload-cms (5e104d4), preserving its 13 unmerged CMS commits, and merges origin/main (b92f888) to include the email-branding fixes. Do not treat it as an independent checkout-only PR into main unless the CMS changes are also intended for release. Existing payload-types.ts edits and the untracked vpr-collection-app@0.1.0 file were preserved.

## Implementation

- Guest checkout and public registration are denied in the storefront server entry points. Checkout requires a valid customer session, a WHOLESALE store matching WMS_STORE_ID, and a CRM-linked wholesale account. WMS remains authoritative for pricing and stock.
- The account email from WMS is used for both ordering and receipts, not the browser-supplied email.
- Every submission carries an attempt key. Pending, lost and unusable payment responses do not invite a new payment. Browser localStorage retains only a random reference across reloads; no automatic expiry clears uncertain payments. Web Locks serialize reservation where supported. This guard is per browser origin, not across devices or deliberately cleared storage.
- The old generic session cookie is mapped to vpr_storefront_session. Existing VPR users using storefront_session must sign in again. Custom cookie names remain supported. Never use another brand's cookie name.
- WMS requests have a 20-second deadline and no automatic payment retry. Turnstile has a five-second deadline and fails closed if missing a secret on deployed environments. Explicit local-only bypass is documented in .env.example.
- Free Shipping is sent as an explicit zero-cost policy, with allowFreeInternational=true and the expected final total. Country code is editable; region names and postal codes are not restricted to US formats. Address suggestions support international results. No paid international rate support, customs calculation, duty/tax calculation, or carrier label purchase is added by this change.

## WMS dependency and deploy order

The separate WMS branch fix/vpr-free-international-shipping adds the optional allowFreeInternational shipping-policy field. It permits non-US addresses only when the storefront explicitly opts in and the flat shipping rate is zero. Existing policies remain US-only by default. No migration is required.

Deploy the WMS API change before VPR staging. Deploying VPR first will safely reject international checkout against an older API. No worker, feed, Cloudflare, Shopify or live-domain changes are included.

## Verification completed locally

- VPR: 24 offline tests passed, covering invited access, rejected guest/non-wholesale/expired/wrong-store access, account-email integrity, explicit free shipping, pending/decline/price outcomes, receipt errors, cookie isolation, Turnstile, and actual component handlers for duplicate clicks and pending remount.
- WMS: 57 coupon/checkout tests passed, including an actual order-route test with mocked database/gateway for Canadian wholesale shipping at zero cost. Existing retail shipping restrictions remain covered.
- Both API and VPR TypeScript checks pass. Targeted VPR ESLint has zero errors and two existing img warnings.
- Browser: anonymous /checkout redirects to /login with invitation-only messaging; /signup renders 404. Local VPR server is loopback-only at http://127.0.0.1:3002 with PAYLOAD_DB_PUSH=false. No real customer account was created and no payment or order was submitted.

## Configuration and remaining integration tests

Local read-only checks: WMS_API_URL points to localhost:3000, expected store ID matches VPR collection, mode WHOLESALE, browser sandbox enabled, Turnstile key and secret present. The storefront DATABASE_URL is unset; the CMS database is a separate remote Supabase host. Do not use the CMS database or the WMS production database for disposable webhook testing.

Before a real sandbox test, configure an isolated local storefront Prisma database and deploy its existing migrations. Confirm WMS gateway sandbox mode, and use a deliberately invited CRM-linked wholesale test customer. Do not create a retail self-signup account. Use a current HTTPS tunnel to port 3002 and set the LOCAL WMS store public/callback URLs to it, keeping all production values unchanged. Use a real owned test inbox or Resend's delivered@resend.dev test address, not example.com.

Test guest denial, invitation acceptance, signed-in prices, a US order and an international order (for example CA/Ontario with a Canadian postal code), zero shipping and correct final totals, decline, successful sandbox authorization, double clicks, lost-response/pending persistence, receipt and signed webhook delivery/deduplication. Cancel/void sandbox orders and confirm allocations are released. Do not buy live labels or release test orders to the real warehouse.

## Recovery and rollback

For uncertain payment, retain the checkout reference and reconcile the WMS StoreCheckoutAttempt and gateway before clearing vpr_checkout_pending_v1. Clearing localStorage does not cancel a payment. Do not ask customers to retry with a new key while an authorization remains uncertain.

Roll back the VPR deployment if staging verification fails. The WMS opt-in change can remain installed because default behavior is unchanged. No database rollback is necessary. Keep the live vprcollection.com Shopify site unchanged until a separate domain-cutover approval.

## Merge review (2026-11-16)

The five committed Payload migrations replayed successfully through the actual Payload CLI on a fresh disposable Docker Postgres database; a second run applied nothing. A production Next build passed with a disposable local CMS database, GCS disabled and schema push disabled. This does not establish that an existing push-built CMS database is compatible: inspect its migration ledger before running the baseline there; do not apply the baseline blindly to existing tables.

Provision both the Payload database and Prisma webhook database before deployment. Run deploy:migrate once in a controlled release step, then build/deploy. Bootstrap the first CMS administrator before exposing /admin publicly. PAYLOAD_DB_PUSH must remain false. Seed only after confirming the target database and storage bucket; seed imports media and can synchronize WMS. Payload currently has no email adapter, so CMS password-reset mail is not configured.

The CMS schema changes are additive on upgrade; do not run down migrations as an application rollback because they drop content tables. Keep a database backup and roll back application images separately.

Validation: 24 checkout/email tests pass; TypeScript and production build pass. Changed checkout files have zero lint errors and two image warnings. Full-repository ESLint still has 16 existing errors outside these changes (nonce-test, not-found, address-autocomplete, and CommonJS email test scripts). Full-repository lint is not green.

Signed-in browser sandbox checkout remains a release gate. Local VPR is WHOLESALE, but tommy@cultivatedagency.com has no storefront customer record in that store. Invite/accept a CRM-linked local test account and provide an HTTPS tunnel on port 3002 before that test. No production settings or live transactions were changed by this review.
