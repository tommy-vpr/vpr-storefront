"use client";

import Link from "next/link";
import { ChevronDown, LogOut, Package, User, ListOrdered } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/actions/logout";
import { CartIcon } from "./cart-icon";
import type { Collection } from "@/lib/wms/types";
import Image from "next/image";

import type { SiteLink } from "@/lib/site-settings";

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
  showQuickOrder?: boolean;
  /** Site → Site settings → Brand. */
  logo: { src: string; width: number; height: number; alt: string };
  /** Site → Site settings → Header: shown after the auto brand menus. */
  links: SiteLink[];
  /** Collection slugs the brand grouping leaves out (they are linked explicitly in `links`). */
  hiddenSlugs: string[];
}

export function Header({ store, customer, collections, showQuickOrder = false, logo, links, hiddenSlugs }: HeaderProps) {
  const isAuthed = customer !== null;
  const displayName = customer?.name ?? customer?.email ?? null;
  const excluded = new Set(hiddenSlugs);
  const brandGroups = groupByBrand(collections.filter((c) => !excluded.has(c.slug)));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container p-2 mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src={logo.src} alt={logo.alt || store.name} width={logo.width} height={logo.height} priority style={{ width: logo.width, height: "auto" }} />
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
                      <Link
                        href={`/collections/${c.slug}`}
                        className="cursor-pointer w-full"
                      >
                        {stripBrandPrefix(c.name, brand)}
                      </Link>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          )}

          {/* Extra links (Site → Site settings → Header) */}
          {links.map((item) => (
            <Button asChild variant="ghost" size="sm" key={item.label + item.href}>
              {item.external ? <a href={item.href} target="_blank" rel="noopener noreferrer">{item.label}</a> : <Link href={item.href}>{item.label}</Link>}
            </Button>
          ))}
          {showQuickOrder && <Button asChild variant="ghost" size="sm"><Link href="/quick-order">Quick Order</Link></Button>}
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
                <DropdownMenuGroup>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{displayName}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {customer.email}
                      </span>
                    </div>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/account" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Account
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/account/orders" className="cursor-pointer">
                    <Package className="mr-2 h-4 w-4" />
                    Orders
                  </Link>
                </DropdownMenuItem>
                {showQuickOrder && <DropdownMenuItem asChild><Link href="/quick-order" className="cursor-pointer"><ListOrdered className="mr-2 h-4 w-4" />Quick Order</Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <form action={logoutAction}>
                  <DropdownMenuItem asChild nativeButton>
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
    const brand = c.brand ?? c.name.split(/\s+/)[0] ?? c.name;
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
