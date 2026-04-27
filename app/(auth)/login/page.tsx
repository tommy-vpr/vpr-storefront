import Link from "next/link";
import { redirect } from "next/navigation";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { tryGetAuthedClient } from "@/lib/wms/session";
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
