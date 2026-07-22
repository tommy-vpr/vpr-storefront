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

export interface ProductListItem {
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  variantName: string;
  imageUrl: string | null;
  price: number | null;
  brand: string | null;
  tags: string[];
}

export interface ProductDetail {
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  variantName: string;
  description: string | null;
  imageUrl: string | null;
  price: number | null;
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
