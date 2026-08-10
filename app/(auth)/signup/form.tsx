"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signupAction, type SignupState } from "./actions";

const initialState: SignupState = { error: null };

export function SignupForm({ redirectTo }: { redirectTo: string | null }) {
  const [state, formAction, pending] = useActionState(
    signupAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          // new-password, not current-password: tells a password manager to
          // offer a generated one rather than autofilling an existing login.
          autoComplete="new-password"
          minLength={8}
          required
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
