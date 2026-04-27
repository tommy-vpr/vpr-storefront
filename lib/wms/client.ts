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
  CustomerProfile,
  InviteContext,
  OrderDetail,
  OrderSummary,
  ProductDetail,
  ProductListItem,
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

    getCollection(
      slug: string,
      params?: { skip?: number; take?: number },
    ): Promise<{
      collection: { id: string; slug: string; name: string; description: string | null };
      products: ProductListItem[];
      total: number;
      skip: number;
      take: number;
    }> {
      const qs = new URLSearchParams();
      if (params?.skip !== undefined) qs.set("skip", String(params.skip));
      if (params?.take !== undefined) qs.set("take", String(params.take));
      const suffix = qs.toString() ? `?${qs.toString()}` : "";
      return request(`/storefront/collections/${slug}${suffix}`, {
        ...base,
        next: { revalidate: 30 },
      });
    },

    getProduct(variantId: string): Promise<{ product: ProductDetail }> {
      return request(`/storefront/products/${variantId}`, {
        ...base,
        next: { revalidate: 30 },
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

    placeOrder(body: {
      items: Array<{ variantId: string; quantity: number }>;
      shippingAddress: ShippingAddress;
      billingAddress?: ShippingAddress;
    }): Promise<{ order: OrderDetail }> {
      return request("/storefront/orders", {
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
