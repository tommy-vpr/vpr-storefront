/**
 * WMS API client — server-side only.
 *
 * Every request forwards:
 *   - x-api-key: WMS_API_KEY              (the per-store key baked into this deployment)
 *   - Authorization: Bearer <customer JWT> (optional, for customer endpoints)
 *
 * The browser never talks to the WMS directly — it talks to Next.js server
 * components / server actions, which call into this client. That keeps the
 * API key server-side.
 */

import type {
  AuthResponse,
  Collection,
  CollectionMeta,
  CollectionProductsParams,
  PageInfo,
  CustomerProfile,
  InviteContext,
  OpaqueData,
  OrderDetail,
  OrderStatus,
  OrderSummary,
  PlacedOrder,
  ProductDetail,
  ProductListItem,
  QuickOrderVariant,
  ShippingAddress,
  StoreInfo,
} from "./types";

export class WmsError extends Error {
  constructor(
    public status: number,
    public body: unknown,
    message: string,
  ) {
    super(message);
    this.name = "WmsError";
  }
}

/** Default products-per-page for collection listings. */
export const DEFAULT_PAGE_SIZE = 60;

interface FetchOptions {
  token?: string | null;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
}

async function request<T>(
  path: string,
  opts: FetchOptions & {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    body?: unknown;
  },
): Promise<T> {
  const apiUrl = process.env.WMS_API_URL;
  const apiKey = process.env.WMS_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error(
      "WMS_API_URL and WMS_API_KEY must be set in the storefront env",
    );
  }

  const headers: Record<string, string> = {
    "x-api-key": apiKey,
  };

  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  if (opts.token) {
    headers["Authorization"] = `Bearer ${opts.token}`;
  }

  const res = await fetch(`${apiUrl}${path}`, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    cache: opts.cache,
    next: opts.next,
  });

  if (res.status === 204) {
    return null as T;
  }

  let body: unknown;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    body = await res.json().catch(() => null);
  } else {
    body = await res.text().catch(() => "");
  }

  if (!res.ok) {
    const errField = (body as { error?: unknown } | null)?.error;
    let message: string;
    if (errField && typeof errField === "object" && "message" in errField) {
      message = String((errField as { message?: string }).message ?? `HTTP ${res.status}`);
    } else if (typeof errField === "string") {
      message = errField;
    } else {
      message = `HTTP ${res.status}`;
    }
    throw new WmsError(res.status, body, message);
  }

  return body as T;
}

// ──────────────────────────────────────────────────────────────────────────
// Client builder
// ──────────────────────────────────────────────────────────────────────────

export function wmsClient(token?: string | null) {
  const base = { token };

  return {
    // ─── Store / catalog ────────────────────────────────────────────────

    getStore(): Promise<{ store: StoreInfo }> {
      return request("/storefront/store", { ...base, next: { revalidate: 60 } });
    },

    getCollections(): Promise<{ collections: Collection[] }> {
      return request("/storefront/collections", {
        ...base,
        next: { revalidate: 60 },
      });
    },

    /**
     * Collection metadata only — no products.
     *
     * NOTE: the WMS still returns `products` on this endpoint. We deliberately
     * do not surface them in the return type so callers can't reintroduce the
     * coupling. Once the API stops embedding products, `take: 0` can be
     * dropped and this becomes a genuinely cheap request.
     *
     * Cached longer than products: metadata rarely changes.
     */
    getCollection(slug: string): Promise<{
      collection: CollectionMeta;
      total: number;
    }> {
      return request(`/storefront/collections/${slug}?take=0`, {
        ...base,
        next: { revalidate: 300, tags: [`collection:${slug}`] },
      });
    },

    /**
     * Products within a collection.
     *
     * Supports skip/take today. `cursor`/`sort`/`filters`/`search` are wired
     * through as query params for when the WMS supports them — until then the
     * API ignores unknown params and `pageInfo` is derived client-side from
     * skip/take/total.
     */
    async getCollectionProducts(
      slug: string,
      params?: CollectionProductsParams,
    ): Promise<{ products: ProductListItem[]; pageInfo: PageInfo }> {
      const take = params?.take ?? DEFAULT_PAGE_SIZE;
      const skip = params?.skip ?? 0;

      const qs = new URLSearchParams();
      qs.set("skip", String(skip));
      qs.set("take", String(take));
      if (params?.cursor) qs.set("cursor", params.cursor);
      if (params?.sort) qs.set("sort", params.sort);
      if (params?.search) qs.set("search", params.search);
      if (params?.filters) {
        for (const [key, value] of Object.entries(params.filters)) {
          if (value === undefined || value === null) continue;
          for (const v of Array.isArray(value) ? value : [value]) {
            qs.append(key, String(v));
          }
        }
      }

      const res = await request<{
        products: ProductListItem[];
        total: number;
        skip: number;
        take: number;
        pageInfo?: PageInfo;
      }>(`/storefront/collections/${slug}?${qs.toString()}`, {
        ...base,
        // NOT CACHED. Prices are per-customer on a wholesale store, and a
        // shared cache would serve one buyer's negotiated price to another —
        // or a guest. The 30s revalidate that used to be here predates
        // customer pricing.
        cache: "no-store",
      });

      // Prefer server-supplied pageInfo once the WMS provides it.
      const pageInfo: PageInfo = res.pageInfo ?? {
        hasNextPage: res.skip + res.products.length < res.total,
        endCursor:
          res.products.length > 0
            ? String(res.skip + res.products.length)
            : null,
        total: res.total,
      };

      return { products: res.products, pageInfo };
    },

    getProduct(variantId: string): Promise<{ product: ProductDetail }> {
      return request(`/storefront/products/${variantId}`, {
        ...base,
        // NOT CACHED — see getCollectionProducts. Per-customer prices can't
        // sit behind a response cache keyed only on the URL.
        cache: "no-store",
      });
    },

    /**
     * Flat variant list for the bulk reorder form.
     *
     * Not cached: prices are per-customer, and this is the one screen where a
     * buyer reads dozens of them at once.
     */
    quickOrder(params?: {
      q?: string;
      collectionId?: string;
      skip?: number;
      take?: number;
    }): Promise<{ variants: QuickOrderVariant[]; total: number }> {
      const qs = new URLSearchParams();
      if (params?.q) qs.set("q", params.q);
      if (params?.collectionId) qs.set("collectionId", params.collectionId);
      qs.set("skip", String(params?.skip ?? 0));
      qs.set("take", String(params?.take ?? 50));

      return request(`/storefront/quick-order?${qs}`, {
        ...base,
        cache: "no-store",
      });
    },

    // ─── Auth / invites ─────────────────────────────────────────────────

    getInvite(token: string): Promise<{ invite: InviteContext }> {
      return request(`/storefront/auth/invite/${token}`, {
        ...base,
        cache: "no-store",
      });
    },

    acceptInvite(body: {
      token: string;
      password: string;
      name?: string;
      phone?: string;
    }): Promise<AuthResponse> {
      return request("/storefront/auth/accept-invite", {
        ...base,
        method: "POST",
        body,
        cache: "no-store",
      });
    },

    /**
     * Retail self-signup. Returns a session token exactly like login — the WMS
     * signs the customer straight in, so there is no second round-trip.
     *
     * Throws WmsError(409) when an account already exists for this email on
     * THIS store. The same email can hold an account on each brand.
     *
     * Past guest orders are NOT attached to the new account: an account is
     * created from an email alone, so matching by email would let anyone who
     * knows an address read that customer's order history.
     */
    register(body: {
      email: string;
      password: string;
      name?: string;
    }): Promise<AuthResponse> {
      return request("/storefront/auth/register", {
        ...base,
        method: "POST",
        body,
        cache: "no-store",
      });
    },

    login(body: { email: string; password: string }): Promise<AuthResponse> {
      return request("/storefront/auth/login", {
        ...base,
        method: "POST",
        body,
        cache: "no-store",
      });
    },

    forgotPassword(email: string): Promise<{ success: true }> {
      return request("/storefront/auth/forgot-password", {
        ...base,
        method: "POST",
        body: { email },
        cache: "no-store",
      });
    },

    resetPassword(body: {
      token: string;
      password: string;
    }): Promise<{ success: true }> {
      return request("/storefront/auth/reset-password", {
        ...base,
        method: "POST",
        body,
        cache: "no-store",
      });
    },

    // ─── Me / profile ───────────────────────────────────────────────────

    getMe(): Promise<{ customer: CustomerProfile }> {
      return request("/storefront/me", { ...base, cache: "no-store" });
    },

    updateMe(body: Partial<{
      name: string;
      phone: string;
      addressLine1: string;
      addressLine2: string;
      city: string;
      state: string;
      zip: string;
      countryCode: string;
    }>): Promise<{ customer: CustomerProfile }> {
      return request("/storefront/me", {
        ...base,
        method: "PATCH",
        body,
        cache: "no-store",
      });
    },

    changePassword(body: {
      currentPassword: string;
      newPassword: string;
    }): Promise<{ success: true }> {
      return request("/storefront/me/change-password", {
        ...base,
        method: "POST",
        body,
        cache: "no-store",
      });
    },

    // ─── Orders ─────────────────────────────────────────────────────────

    /**
     * Place an order. Guest or logged-in.
     *
     * `email` is required for guests and IGNORED when a customer token is
     * present — the WMS takes the token's email as authoritative, so there is
     * no way to place an order under someone else's address while signed in.
     *
     * `payment` is typed optional to mirror the API, but retail checkout
     * ALWAYS sends it: the route deletes the order and returns 402 "Payment is
     * required" without it. There is no invoice-me path on this endpoint.
     *
     * Omitting `billingAddress` makes the WMS copy the shipping address. Send
     * it anyway when the customer gives one — AVS match improves the
     * authorization rate.
     *
     * On decline the WMS deletes the order and throws WmsError(402); nothing
     * is left behind to retry against, so a retry re-posts the whole order
     * with a NEW nonce.
     */
    placeOrder(body: {
      items: Array<{ variantId: string; quantity: number }>;
      shippingAddress: ShippingAddress;
      billingAddress?: ShippingAddress;
      email?: string;
      payment?: { opaqueData: OpaqueData };
    }): Promise<{ order: PlacedOrder }> {
      return request("/storefront/orders", {
        ...base,
        method: "POST",
        body,
        cache: "no-store",
      });
    },

    /**
     * Guest order status by the token emailed to them. The primary lookup —
     * no enumeration surface, so it carries a far looser rate limit than the
     * orderNumber+email fallback.
     *
     * Returns status and tracking only: no line items, addresses, or pricing
     * beyond the total. Anyone with the link can see it.
     */
    getOrderByToken(token: string): Promise<{ order: OrderStatus }> {
      return request(`/storefront/orders/token/${token}`, {
        ...base,
        cache: "no-store",
      });
    },

    /**
     * Fallback lookup for a customer who lost the link. Hardened server-side
     * (5/min per IP, constant-time email compare, identical 404 whether the
     * order or the email is wrong, minimum response time) — so treat every
     * failure as "not found" and never surface which half was wrong.
     */
    lookupOrder(body: {
      orderNumber: string;
      email: string;
    }): Promise<{ order: OrderStatus }> {
      return request("/storefront/orders/lookup", {
        ...base,
        method: "POST",
        body,
        cache: "no-store",
      });
    },

    getOrders(params?: { skip?: number; take?: number }): Promise<{
      orders: OrderSummary[];
      total: number;
      skip: number;
      take: number;
    }> {
      const qs = new URLSearchParams();
      if (params?.skip !== undefined) qs.set("skip", String(params.skip));
      if (params?.take !== undefined) qs.set("take", String(params.take));
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request(`/storefront/orders${suffix}`, {
        ...base,
        cache: "no-store",
      });
    },

    getOrder(id: string): Promise<{ order: OrderDetail }> {
      return request(`/storefront/orders/${id}`, {
        ...base,
        cache: "no-store",
      });
    },
  };
}
