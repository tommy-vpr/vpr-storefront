"use client";

import { useActionState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AddressAutocomplete,
  type ResolvedAddress,
} from "@/components/address-autocomplete";
import {
  updateProfileAction,
  changePasswordAction,
  type FormState,
} from "./actions";

// Defined here rather than alongside the actions: a "use server" module can
// only export async functions.
const emptyState: FormState = { error: null, success: null };
import type { CustomerProfile } from "@/lib/wms/types";
import { useState } from "react";

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

  // EVERY field is controlled, for two separate reasons. The address fields
  // have to be, because picking a suggestion writes into four of them at once
  // and defaultValue only seeds the first render. Name and phone follow suit
  // because updateProfileAction calls revalidatePath("/account"), which
  // re-renders this component with fresh props — and a defaultValue that
  // changes after mount is what Base UI warns about ("changing the default
  // value state of an uncontrolled FieldControl"). Harmless in practice, since
  // React ignores it, but it would silently show stale text if the server ever
  // normalized a value on save.
  const [addr, setAddr] = useState({
    name: customer.name ?? "",
    phone: customer.phone ?? "",
    addressLine1: customer.addressLine1 ?? "",
    addressLine2: customer.addressLine2 ?? "",
    city: customer.city ?? "",
    state: customer.state ?? "",
    zip: customer.zip ?? "",
  });

  const applyResolved = (r: ResolvedAddress) =>
    setAddr((prev) => ({
      ...prev,
      addressLine1: r.address1,
      // Google rarely returns a unit; keep whatever they typed if it doesn't.
      addressLine2: r.address2 || prev.addressLine2,
      city: r.city,
      state: r.state,
      zip: r.zip,
    }));

  return (
    <form action={formAction} className="space-y-4">
      <Feedback state={state} />

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          value={addr.name}
          onChange={(e) => setAddr((p) => ({ ...p, name: e.target.value }))}
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
          value={addr.phone}
          onChange={(e) => setAddr((p) => ({ ...p, phone: e.target.value }))}
          autoComplete="tel"
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressLine1">Address</Label>
        <AddressAutocomplete
          id="addressLine1"
          name="addressLine1"
          value={addr.addressLine1}
          onChange={(v) => setAddr((p) => ({ ...p, addressLine1: v }))}
          onResolved={applyResolved}
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressLine2">Apartment, suite (optional)</Label>
        <Input
          id="addressLine2"
          name="addressLine2"
          value={addr.addressLine2}
          onChange={(e) =>
            setAddr((p) => ({ ...p, addressLine2: e.target.value }))
          }
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
            value={addr.city}
            onChange={(e) => setAddr((p) => ({ ...p, city: e.target.value }))}
            autoComplete="address-level2"
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            name="state"
            value={addr.state}
            onChange={(e) => setAddr((p) => ({ ...p, state: e.target.value }))}
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
            value={addr.zip}
            onChange={(e) => setAddr((p) => ({ ...p, zip: e.target.value }))}
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
