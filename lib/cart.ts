/**
 * Cart shape — lives only in the browser (localStorage). Prices are cached
 * here for snappy UI, but verified server-side at checkout via price lookup
 * against the variant. Never trust these numbers for the actual total.
 */

export interface CartItem {
  variantId: string;
  productId: string;
  sku: string;
  name: string;
  variantName: string;
  imageUrl: string | null;
  price: number;
  quantity: number;
}
