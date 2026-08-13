import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { tryGetAuthedClient } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";
import { ProfileForm, PasswordForm } from "./forms";

/**
 * Account profile.
 *
 * The saved address is a convenience for the customer, not a source of truth:
 * checkout still collects a shipping address per order, because people ship to
 * different places and an order's address must be whatever was entered when it
 * was placed. Nothing here reaches back into an existing order.
 */

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const client = await tryGetAuthedClient();
  if (!client) redirect("/login?redirect=/account");

  let customer;
  try {
    const res = await client.getMe();
    customer = res.customer;
  } catch (err) {
    // An expired JWT satisfies the cookie-only check and only fails here.
    if (err instanceof WmsError && err.status === 401) {
      redirect("/login?redirect=/account");
    }
    throw err;
  }

  return (
    <div className="mx-auto max-w-2xl mt-12">
      <h1 className="text-3xl font-semibold tracking-tight">Your account</h1>
      <p className="mt-2 text-sm text-muted-foreground">{customer.email}</p>

      <div className="mt-8">
        <Button asChild variant="outline">
          <Link href="/account/orders">View your orders</Link>
        </Button>
      </div>

      <Separator className="my-8" />

      <section>
        <h2 className="text-lg font-medium">Details</h2>
        <p className="mt-1 mb-4 text-sm text-muted-foreground">
          Saved for convenience. You&apos;ll still confirm a shipping address at
          checkout.
        </p>
        <ProfileForm customer={customer} />
      </section>

      <Separator className="my-8" />

      <section>
        <h2 className="text-lg font-medium">Password</h2>
        <div className="mt-4">
          <PasswordForm />
        </div>
      </section>
    </div>
  );
}
