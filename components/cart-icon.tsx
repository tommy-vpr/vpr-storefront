"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "./cart-provider";

export function CartIcon() {
  const { itemCount, isHydrated } = useCart();

  return (
    <Link
      href="/cart"
      className="relative flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-accent"
      aria-label={`Cart, ${itemCount} items`}
    >
      <ShoppingBag className="h-5 w-5" />
      {isHydrated && itemCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] font-medium leading-none text-background">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      )}
    </Link>
  );
}
