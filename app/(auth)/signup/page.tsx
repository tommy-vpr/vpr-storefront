import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { tryGetAuthedClient } from "@/lib/wms/session";
import { SignupForm } from "./form";

/**
 * Retail self-signup.
 *
 * An account is optional — checkout works fine as a guest — so this page is
 * careful not to imply otherwise. What an account buys is order history in one
 * place; a guest still gets a status link on every order.
 */

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;

  const authed = await tryGetAuthedClient();
  if (authed) {
    redirect(safeRedirect(redirectTo) ?? "/");
  }

  const dest = safeRedirect(redirectTo);

  return (
    <>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Keep your orders in one place. You can also check out as a guest —
          every order comes with its own tracking link.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm redirectTo={dest} />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={dest ? `/login?redirect=${encodeURIComponent(dest)}` : "/login"}
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </CardContent>
    </>
  );
}

/** Only accept same-site redirects — prevents open-redirect abuse. */
function safeRedirect(value: string | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
