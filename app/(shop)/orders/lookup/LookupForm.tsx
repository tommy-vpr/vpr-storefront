"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrderStatusCard } from "@/components/order-status-card";
import { lookupOrderAction } from "./actions";
import type { OrderStatus } from "@/lib/wms/types";

export function LookupForm({ initialOrderNumber }: { initialOrderNumber?: string }) {
  const [orderNumber, setOrderNumber] = useState(initialOrderNumber ?? "");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    setBusy(true);
    const result = await lookupOrderAction(orderNumber, email);
    setBusy(false);
    if (result.ok) {
      setOrder(result.order);
    } else {
      setOrder(null);
      setError(result.message);
    }
  };

  if (order) {
    return (
      <div>
        <OrderStatusCard order={order} />
        <Button
          variant="outline"
          className="mt-8"
          onClick={() => {
            setOrder(null);
            setEmail("");
          }}
        >
          Look up another order
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-1.5">
        <Label htmlFor="orderNumber">Order number</Label>
        <Input
          id="orderNumber"
          value={orderNumber}
          onChange={(e) => setOrderNumber(e.target.value)}
          placeholder="SF-VPR-COLLECTION-000123"
          // Uppercased server-side too — order numbers are stored uppercase and
          // a customer retyping one from an email shouldn't have to care.
          autoCapitalize="characters"
        />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="lookup-email">Email</Label>
        <Input
          id="lookup-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <p className="text-xs text-muted-foreground">
          The address you used when you placed the order.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <Button onClick={submit} disabled={busy}>
        {busy ? "Looking up…" : "Find my order"}
      </Button>
    </div>
  );
}
