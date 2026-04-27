"use client";

import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "./cart-provider";
import type { CartItem } from "@/lib/cart";

type Props = {
  item: Omit<CartItem, "quantity">;
  disabled?: boolean;
};

export function AddToCartButton({ item, disabled }: Props) {
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [justAdded, setJustAdded] = useState(false);

  const handleAdd = () => {
    addItem(item, qty);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1500);
  };

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex items-center rounded-md border">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setQty((q) => Math.max(1, q - 1))}
          disabled={disabled || qty <= 1}
          aria-label="Decrease quantity"
          className="rounded-r-none"
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-12 text-center text-sm font-medium">{qty}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setQty((q) => q + 1)}
          disabled={disabled}
          aria-label="Increase quantity"
          className="rounded-l-none"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <Button
        type="button"
        onClick={handleAdd}
        disabled={disabled}
        className="flex-1"
      >
        {justAdded ? (
          <>
            <Check className="mr-2 h-4 w-4" />
            Added
          </>
        ) : (
          "Add to cart"
        )}
      </Button>
    </div>
  );
}
