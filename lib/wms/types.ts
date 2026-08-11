/**
 * Types mirror the WMS /storefront/* API response shapes.
 * Keep in sync with:
 *   apps/api/src/routes/storefront.routes.ts
 *   apps/api/src/routes/storefront-auth.routes.ts
 *   apps/api/src/routes/storefront-orders.routes.ts
 */

export interface StoreInfo {
  id: string;
  slug: string;
  name: string;
  publicUrl: string;
  supportEmail: string | null;
  logoUrl: string | null;
  primaryColor: string | null;
  /**
   * RETAIL — self-signup, guest checkout, public prices.
   * WHOLESALE — invite-only; accounts come from a sales rep.
   *
   * A UI hint only. The WMS enforces the same rule on every endpoint, because
   * this value arrives in a response anyone posting directly can ignore.
   */
  mode: "RETAIL" | "WHOLESALE";
}

export interface Collection {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  productCount: number;
  featured: boolean;
  sortOrder: number;
  brand?: string | null;
}

/** Metadata for a single collection — the shape returned by GET /collections/:slug. */
export interface CollectionMeta {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  /** Not yet returned by the WMS; present here for the Phase 2 metadata endpoint. */
  heroImage?: string | null;
  productCount?: number;
}

export type CollectionSort =
  | "featured"
  | "name-asc"
  | "name-desc"
  | "price-asc"
  | "price-desc"
  | "newest";

export interface CollectionProductsParams {
  take?: number;
  skip?: number;
  /** Reserved for cursor pagination once the WMS supports it. */
  cursor?: string | null;
  sort?: CollectionSort;
  search?: string;
  filters?: Record<string, string | string[] | undefined>;
}

export interface PageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
  /** Total matching products, when the API can supply it. */
  total?: number;
}

/** A single sellable variant, as returned inside a product. */
export interface ProductVariantOption {
  variantId: string;
  sku: string;
  /** Full stored name, e.g. "30ml - Skwezed Salt - Banana — 25mg". */
  name: string;
  /** Picker button text with the product-name prefix stripped, e.g. "25mg". */
  label: string;
  imageUrl: string | null;
  /**
   * What THIS customer pays. For a guest or a retail customer that's the
   * catalogue price; for a signed-in wholesale customer it's resolved from
   * their account's pricing tags.
   */
  price: number | null;
  /**
   * The catalogue price, present ONLY when this customer's price is lower —
   * i.e. when a strike-through is meaningful. Null otherwise, so the client
   * never has to decide whether showing it makes sense.
   */
  listPrice?: number | null;
}

export interface ProductListItem {
  productId: string;
  /** Default variant — kept as the card's link target. */
  variantId: string;
  defaultVariantId: string;
  sku: string;
  name: string;
  variantName: string;
  imageUrl: string | null;
  /** Default variant's price. Not a range — see storefront.routes.ts. */
  price: number | null;
  /** Catalogue price, present only when this customer pays less. */
  listPrice?: number | null;
  variantCount: number;
  variants: ProductVariantOption[];
  brand: string | null;
  tags: string[];
}

export interface ProductDetail {
  productId: string;
  variantId: string;
  /** All sellable variants of this product — powers the picker. */
  variants: ProductVariantOption[];
  variantCount: number;
  selectedVariantId: string;
  /** Label of the variant currently being viewed, e.g. "25mg". */
  variantLabel: string;
  sku: string;
  name: string;
  variantName: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
  /** Catalogue price, present only when this customer pays less. */
  listPrice?: number | null;
  brand: string | null;
  category: string | null;
  tags: string[];
  weight: number | null;
  weightUnit: string | null;
  inStock: boolean;
}

export interface InviteContext {
  email: string;
  name: string | null;
  expiresAt: string;
  store: {
    id: string;
    slug: string;
    name: string;
    logoUrl: string | null;
  };
}

export interface Customer {
  id: string;
  email: string;
  name: string | null;
}

export interface CustomerProfile extends Customer {
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  countryCode: string | null;
  emailVerified: boolean;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  customer: Customer;
}

export interface ShippingAddress {
  name: string;
  address1: string;
  address2?: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  phone?: string;
}

export interface OrderItem {
  sku: string;
  productVariantId: string | null;
  productName?: string;
  imageUrl?: string | null;
  quantity: number;
  quantityShipped?: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  itemCount: number;
  trackingNumber: string | null;
  shippedAt: string | null;
  createdAt: string;
}

/**
 * The single-use payment nonce Accept.js hands back in the browser. Card data
 * goes straight from the customer to Authorize.net and never reaches our
 * servers — this pair is all we ever hold, and it dies in ~15 minutes.
 */
export interface OpaqueData {
  dataDescriptor: string;
  dataValue: string;
}

/**
 * The 201 from POST /storefront/orders. NOT the same shape as OrderDetail —
 * it carries guestAccessToken (the only time it is ever returned) and omits
 * addresses and tracking.
 *
 * guestAccessToken is what the confirmation link is built from, so it must
 * reach the confirmation email and nowhere else — it is deliberately absent
 * from every lookup response.
 */
export interface PlacedOrder {
  id: string;
  orderNumber: string;
  guestAccessToken: string | null;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  createdAt: string;
  items: Array<{
    sku: string;
    productVariantId: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

/**
 * What a guest lookup returns — status and tracking, nothing more. Both lookup
 * routes share this shape deliberately: anyone holding the link or the order
 * number can see it, so it carries no line items, addresses, or prices beyond
 * the total.
 */
export interface OrderStatus {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  trackingNumber: string | null;
  trackingUrl: string | null;
  carrier: string | null;
  shippedAt: string | null;
  createdAt: string;
}

export interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  shippingAddress: ShippingAddress;
  billingAddress: ShippingAddress | null;
  trackingNumber: string | null;
  shippedAt: string | null;
  createdAt: string;
  items: OrderItem[];
  shipments?: Array<{
    trackingNumber: string | null;
    trackingUrl: string | null;
    carrier: string;
    service: string;
    createdAt: string;
  }>;
}
