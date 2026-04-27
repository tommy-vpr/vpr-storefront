# Storefront (multi-tenant)

A single Next.js 15 deployment that serves multiple customer stores. Each store
gets its own hostname (`acme.shop.hq.team` or `shop.acme.com`) pointing to the
same deployment. At request time, middleware reads the `Host` header, resolves
which store this request belongs to, and scopes everything downstream to that
store.

The WMS is the source of truth — this app is a thin UI over the `/storefront/*`
API.

## Setup

```bash
# 1. Scaffold the Next.js app
pnpm create next-app@latest storefront --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*"
cd storefront

# 2. Init shadcn
pnpm dlx shadcn@latest init -d --base-color neutral

# 3. Add the components we'll use
pnpm dlx shadcn@latest add button input card label alert form separator dropdown-menu

# 4. Install a few extras we'll need
pnpm add jsonwebtoken
pnpm add -D @types/jsonwebtoken

# 5. Copy the custom files from this delivery (lib/wms/*, middleware.ts, etc.)
# 6. Fill in .env.local from .env.example
# 7. Run it
pnpm dev
```

## Local DNS for testing multi-tenant

You can't hit the storefront as `localhost` and have host resolution work. Two
options for local dev:

**Option A — use a free wildcard DNS service:**
- `http://acme.localtest.me:3002` → always resolves to 127.0.0.1
- `http://blinkers.localtest.me:3002` → same
- No hosts-file editing needed

**Option B — edit your hosts file** (`C:\Windows\System32\drivers\etc\hosts` on
Windows, `/etc/hosts` elsewhere):

```
127.0.0.1 acme.localhost
127.0.0.1 blinkers.localhost
```

Then `http://acme.localhost:3002` works.

Use whichever hostname you pick as the `primaryHost` value when creating the
store in WMS.

## Deployment

Coolify / any Next.js host:
- Set env vars from `.env.example`
- Configure additional domains in the app settings (one per customer store)
- Each customer sets a CNAME pointing their domain at your Coolify host
