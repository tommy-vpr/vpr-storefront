import { LookupForm } from "./LookupForm";

/**
 * Order lookup — for a customer who no longer has the emailed link.
 *
 * This static segment sits alongside /orders/[token]; Next resolves a literal
 * "lookup" here rather than treating it as a token, and a real token is 64 hex
 * characters so the two can never collide anyway.
 *
 * `?placed=SF-...` is set by checkout in the one case where an order is placed
 * but no guestAccessToken comes back. Rare, but the alternative is a customer
 * with a charged card and no way to see their order.
 */

export const dynamic = "force-dynamic";

export default async function LookupPage({
  searchParams,
}: {
  searchParams: Promise<{ placed?: string }>;
}) {
  const { placed } = await searchParams;

  return (
    <div className="mx-auto max-w-md mt-12">
      {placed ? (
        <>
          <h1 className="text-3xl font-semibold tracking-tight">
            Your order is placed
          </h1>
          <p className="mt-2 text-muted-foreground">
            Order <span className="font-medium">{placed}</span> went through.
            Enter your email below to see its status, and check your inbox for
            the confirmation.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-semibold tracking-tight">
            Find your order
          </h1>
          <p className="mt-2 text-muted-foreground">
            Enter your order number and the email you used at checkout. The link
            in your confirmation email gets you here in one click.
          </p>
        </>
      )}

      <div className="mt-8">
        <LookupForm initialOrderNumber={placed} />
      </div>
    </div>
  );
}
