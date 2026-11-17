import Link from "next/link";
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ResetPasswordForm } from "./form";

export const dynamic = "force-dynamic";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <>
        <CardHeader>
          <CardTitle>Reset link incomplete</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              The link you used is missing its reset token. Please request a
              new one.
            </AlertDescription>
          </Alert>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            <Link
              href="/forgot-password"
              className="font-medium text-foreground underline-offset-4 hover:underline"
            >
              Request a new link
            </Link>
          </p>
        </CardContent>
      </>
    );
  }

  return (
    <>
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          Set a new password for your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetPasswordForm token={token} />
      </CardContent>
    </>
  );
}
