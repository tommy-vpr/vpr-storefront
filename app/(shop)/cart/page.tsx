"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/components/cart-provider";
import { formatPrice } from "@/lib/format";

export default function CartPage() {
  const { items, subtotal, isHydrated, updateQuantity, removeItem } = useCart();

  // Show a placeholder during hydration so the UI doesn't flash empty-cart
  // on a page refresh where the cart has items in localStorage.
  if (!isHydrated) {
    return (
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight">Cart</h1>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center min-h-[60vh] flex flex-col justify-center items-center">
        <h1 className="text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">
          Add products from the shop to get started.
        </p>
        <Button asChild className="mt-6">
          <Link href="/all-collections">Browse collections</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight">Cart</h1>

      <div className="space-y-4">
        {items.map((item) => (
          <div
            key={item.variantId}
            className="flex gap-4 rounded-lg border bg-card p-4"
          >
            <Link
              href={`/products/${item.variantId}`}
              className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-muted"
            >
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
                  No image
                </div>
              )}
            </Link>

            <div className="flex min-w-0 flex-1 flex-col">
              <Link
                href={`/products/${item.variantId}`}
                className="line-clamp-1 text-sm font-medium hover:underline"
              >
                {item.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {item.variantName}
              </p>
              <p className="mt-1 font-mono text-[10px] text-muted-foreground">
                {item.sku}
              </p>

              <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                <div className="flex items-center rounded-md border">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-r-none"
                    onClick={() =>
                      updateQuantity(item.variantId, item.quantity - 1)
                    }
                    aria-label="Decrease quantity"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-10 text-center text-sm">
                    {item.quantity}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-l-none"
                    onClick={() =>
                      updateQuantity(item.variantId, item.quantity + 1)
                    }
                    aria-label="Increase quantity"
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => removeItem(item.variantId)}
                  aria-label="Remove from cart"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="text-right">
              <p className="text-sm font-medium">
                {formatPrice(item.price * item.quantity)}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatPrice(item.price)} each
              </p>
            </div>
          </div>
        ))}
      </div>

      <Separator className="my-8" />

      <div className="space-y-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Shipping</span>
          <span>Calculated at fulfillment</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-lg font-medium">
          <span>Total</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
      </div>

      <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button asChild variant="outline">
          <Link href="/">Continue shopping</Link>
        </Button>
        <Button asChild>
          <Link href="/checkout">Checkout</Link>
        </Button>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Orders are invoiced — no payment at checkout. Your sales rep will follow
        up after submission.
      </p>
    </div>
  );
}
