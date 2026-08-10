"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  updateProfileAction,
  changePasswordAction,
  emptyState,
  type FormState,
} from "./actions";
import type { CustomerProfile } from "@/lib/wms/types";

function Feedback({ state }: { state: FormState }) {
  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }
  if (state.success) {
    return (
      <Alert>
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }
  return null;
}

export function ProfileForm({ customer }: { customer: CustomerProfile }) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction,
    emptyState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Feedback state={state} />

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={customer.name ?? ""}
          autoComplete="name"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={customer.phone ?? ""}
          autoComplete="tel"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressLine1">Address</Label>
        <Input
          id="addressLine1"
          name="addressLine1"
          defaultValue={customer.addressLine1 ?? ""}
          autoComplete="address-line1"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressLine2">Apartment, suite (optional)</Label>
        <Input
          id="addressLine2"
          name="addressLine2"
          defaultValue={customer.addressLine2 ?? ""}
          autoComplete="address-line2"
          disabled={pending}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            name="city"
            defaultValue={customer.city ?? ""}
            autoComplete="address-level2"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            name="state"
            defaultValue={customer.state ?? ""}
            autoComplete="address-level1"
            maxLength={2}
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="zip">ZIP</Label>
          <Input
            id="zip"
            name="zip"
            defaultValue={customer.zip ?? ""}
            autoComplete="postal-code"
            disabled={pending}
          />
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(
    changePasswordAction,
    emptyState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <Feedback state={state} />

      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          disabled={pending}
        />
      </div>

      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Updating..." : "Change password"}
      </Button>
    </form>
  );
}
