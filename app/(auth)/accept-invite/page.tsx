import Link from "next/link";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getClient } from "@/lib/wms/session";
import { WmsError } from "@/lib/wms/client";
import { AcceptInviteForm } from "./form";

export const dynamic = "force-dynamic";

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; redirect?: string }>;
}) {
  const { token, redirect: redirectTo } = await searchParams;

  if (!token) {
    return (
      <>
        <CardHeader>
          <CardTitle>Missing invite token</CardTitle>
          <CardDescription>
            The link you used is incomplete. Please use the link from the
            invite email.
          </CardDescription>
        </CardHeader>
      </>
    );
  }

  let inviteContext;
  try {
    const { invite } = await getClient().getInvite(token);
    inviteContext = invite;
  } catch (err) {
    const message =
      err instanceof WmsError
        ? err.message
        : err instanceof Error
          ? err.message
          : "This invite is invalid.";

    return (
      <>
        <CardHeader>
          <CardTitle>Invite unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>{message}</AlertDescription>
          </Alert>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Welcome to {inviteContext.store.name}</CardTitle>
        <CardDescription>
          Set a password to finish creating your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AcceptInviteForm
          token={token}
          email={inviteContext.email}
          prefilledName={inviteContext.name}
          redirectTo={safeRedirect(redirectTo)}
        />
      </CardContent>
    </>
  );
}

function safeRedirect(value: string | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}
