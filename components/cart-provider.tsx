"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { CartItem } from "@/lib/cart";

interface CartContextValue {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  isHydrated: boolean;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

/**
 * localStorage namespace for the cart.
 *
 * Deliberately NOT derived from the store slug fetched at request time. Each
 * storefront (vpr, itslitto, burningdaily) is its own deploy with its own
 * origin, so localStorage is already isolated per brand — the slug added no
 * separation, only a failure mode: if the layout ever fell back to a
 * placeholder slug during a WMS outage, the key would change and every
 * customer's cart would silently read as empty while their real items sat
 * under the old key. That looks like data loss and is worse than an error
 * page.
 *
 * A constant key cannot drift with backend state.
 */
const STORAGE_KEY = "cart:v1";

export function CartProvider({
  storeSlug,
  children,
}: {
  /**
   * Retained only to migrate carts written under the old `cart:${slug}` key.
   * Optional — the cart works without it. Safe to drop this prop once the
   * migration window has passed.
   */
  storeSlug?: string;
  children: ReactNode;
}) {
  const storageKey = STORAGE_KEY;
  const [items, setItems] = useState<CartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after mount. Guarded so the empty initial state
  // doesn't clobber existing storage on first render.
  useEffect(() => {
    try {
      let raw = localStorage.getItem(storageKey);

      // One-time migration off the old slug-scoped key. Only runs when the
      // new key is empty, so it can never clobber a newer cart.
      if (!raw && storeSlug) {
        const legacyKey = `cart:${storeSlug}`;
        const legacy = localStorage.getItem(legacyKey);
        if (legacy) {
          raw = legacy;
          localStorage.setItem(storageKey, legacy);
          localStorage.removeItem(legacyKey);
        }
      }

      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed);
      }
    } catch {
      // Corrupt JSON — fall back to empty cart
    }
    setIsHydrated(true);
  }, [storageKey, storeSlug]);

  // Persist on every change, but only after hydration
  useEffect(() => {
    if (!isHydrated) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Quota exceeded / disabled — silently fail
    }
  }, [items, isHydrated, storageKey]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">, quantity = 1) => {
      setItems((prev) => {
        const existing = prev.find((i) => i.variantId === item.variantId);
        if (existing) {
          return prev.map((i) =>
            i.variantId === item.variantId
              ? { ...i, quantity: i.quantity + quantity }
              : i,
          );
        }
        return [...prev, { ...item, quantity }];
      });
    },
    [],
  );

  const updateQuantity = useCallback(
    (variantId: string, quantity: number) => {
      setItems((prev) => {
        if (quantity <= 0) {
          return prev.filter((i) => i.variantId !== variantId);
        }
        return prev.map((i) =>
          i.variantId === variantId ? { ...i, quantity } : i,
        );
      });
    },
    [],
  );

  const removeItem = useCallback((variantId: string) => {
    setItems((prev) => prev.filter((i) => i.variantId !== variantId));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(() => {
    const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    return {
      items,
      itemCount,
      subtotal,
      isHydrated,
      addItem,
      updateQuantity,
      removeItem,
      clear,
    };
  }, [items, isHydrated, addItem, updateQuantity, removeItem, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return ctx;
}
