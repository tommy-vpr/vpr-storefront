"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Package, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/actions/logout";
import { CartIcon } from "./cart-icon";
import type { Collection } from "@/lib/wms/types";
import Image from "next/image";

// ─── Edit these to customize the nav ─────────────────────────────────────
// Brand placeholders: shown alongside the real brand menus. Remove a brand
// from here once you have collections assigned for it (the auto-grouping
// will pick them up).
const BRAND_PLACEHOLDERS: { label: string; href: string }[] = [
  { label: "IJoy", href: "#" },
  { label: "Nicci", href: "#" },
  { label: "Blankers", href: "#" },
];

// Static utility links. Point to real pages once they exist.
const UTILITY_LINKS: { label: string; href: string }[] = [
  { label: "Wholesale App", href: "/wholesale" },
  { label: "Quick Order", href: "/quick-order" },
  { label: "Merch", href: "/merch" },
];
// ─────────────────────────────────────────────────────────────────────────

interface HeaderProps {
  store: {
    name: string;
    logoUrl: string | null;
  };
  customer: {
    name: string | null;
    email: string;
  } | null;
  collections: Collection[];
}

export function Header({ store, customer, collections }: HeaderProps) {
  const isAuthed = customer !== null;
  const displayName = customer?.name ?? customer?.email ?? null;
  const brandGroups = groupByBrand(collections);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={"/images/logo-main.png"}
            alt="vpr collection"
            width={140}
            height={100}
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {/* Dynamic brand menus from assigned collections */}
          {Array.from(brandGroups.entries()).map(([brand, cols]) =>
            cols.length === 1 ? (
              <Button asChild variant="ghost" size="sm" key={brand}>
                <Link href={`/collections/${cols[0].slug}`}>{brand}</Link>
              </Button>
            ) : (
              <DropdownMenu key={brand}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    {brand}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {cols.map((c) => (
                    <DropdownMenuItem asChild key={c.id}>
                      <Link href={`/collections/${c.slug}`}>
                        {stripBrandPrefix(c.name, brand)}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          )}

          {/* Placeholder brands (edit BRAND_PLACEHOLDERS above) */}
          {BRAND_PLACEHOLDERS.map((item) => (
            <Button asChild variant="ghost" size="sm" key={item.label}>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}

          {/* Utility links (edit UTILITY_LINKS above) */}
          {UTILITY_LINKS.map((item) => (
            <Button asChild variant="ghost" size="sm" key={item.href}>
              <Link href={item.href}>{item.label}</Link>
            </Button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <CartIcon />

          {isAuthed && customer ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  <span className="hidden max-w-[160px] truncate sm:inline">
                    {displayName}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {customer.email}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account">
                    <User className="mr-2 h-4 w-4" />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/orders">
                    <Package className="mr-2 h-4 w-4" />
                    Orders
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logoutAction}>
                  <DropdownMenuItem asChild>
                    <button type="submit" className="w-full cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Log out
                    </button>
                  </DropdownMenuItem>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────

function groupByBrand(collections: Collection[]): Map<string, Collection[]> {
  const groups = new Map<string, Collection[]>();
  for (const c of collections) {
    const brand = c.name.split(/\s+/)[0] ?? c.name;
    const existing = groups.get(brand);
    if (existing) {
      existing.push(c);
    } else {
      groups.set(brand, [c]);
    }
  }
  return groups;
}

function stripBrandPrefix(name: string, brand: string): string {
  const prefix = `${brand} `;
  return name.startsWith(prefix) ? name.slice(prefix.length) : name;
}
