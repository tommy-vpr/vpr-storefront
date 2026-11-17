import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getClient, tryGetAuthedClient } from "@/lib/wms/session";
import { LoginForm } from "./form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string }>;
}) {
  const { redirect: redirectTo } = await searchParams;

  // If already authed, bounce — honoring the redirect if it's safe
  const authed = await tryGetAuthedClient();
  if (authed) {
    redirect(safeRedirect(redirectTo) ?? "/");
  }

  const { store } = await getClient().getStore();

  return (
    <>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>
          Enter your email and password to access your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm redirectTo={safeRedirect(redirectTo)} />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link
            href="/forgot-password"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </p>

        {/* Hidden on a wholesale store — there's nothing to link to, and
            inviting someone to create an account they can't create is worse
            than saying nothing. */}
        {store.mode !== "WHOLESALE" && (
        <p className="mt-2 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link
            href={
              safeRedirect(redirectTo)
                ? `/signup?redirect=${encodeURIComponent(safeRedirect(redirectTo)!)}`
                : "/signup"
            }
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create an account
          </Link>
        </p>
        )}
      </CardContent>
    </>
  );
}

/** Only accept same-site redirects — prevents open-redirect abuse via ?redirect=https://evil.com */
function safeRedirect(value: string | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
