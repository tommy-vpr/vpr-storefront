"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { acceptInviteAction, type AcceptInviteState } from "./actions";

const initialState: AcceptInviteState = { error: null };

interface Props {
  token: string;
  email: string;
  prefilledName: string | null;
  redirectTo: string | null;
}

export function AcceptInviteForm({
  token,
  email,
  prefilledName,
  redirectTo,
}: Props) {
  const [state, formAction, pending] = useActionState(
    acceptInviteAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <input type="hidden" name="token" value={token} />
      {redirectTo && (
        <input type="hidden" name="redirect" value={redirectTo} />
      )}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          disabled
          readOnly
          className="bg-muted"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Your name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          defaultValue={prefilledName ?? ""}
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          At least 8 characters.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
