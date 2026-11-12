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
import Image from "next/image";

import type { NavItem } from "@/lib/navigation";

interface HeaderProps {
  store: {
    name: string;
    logoUrl: string | null;
  };
  customer: {
    name: string | null;
    email: string;
  } | null;
  showQuickOrder?: boolean;
  /** Site → Site settings → Brand. */
  logo: { src: string; width: number; height: number; alt: string };
  /** Site → Navigation (or the built-in menu), already resolved to links. */
  menu: NavItem[];
}

export function Header({ store, customer, showQuickOrder = false, logo, menu }: HeaderProps) {
  const isAuthed = customer !== null;
  const displayName = customer?.name ?? customer?.email ?? null;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
      <div className="container p-2 mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src={logo.src} alt={logo.alt || store.name} width={logo.width} height={logo.height} priority style={{ width: logo.width, height: "auto" }} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {menu.map((item) =>
            item.children?.length ? (
              <DropdownMenu key={item.title + item.href}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-1">
                    {item.title}
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {item.children.map((c) => (
                    <DropdownMenuItem asChild key={c.title + c.href}>
                      {c.external ? (
                        <a href={c.href} target="_blank" rel="noopener noreferrer" className="cursor-pointer w-full">{c.title}</a>
                      ) : (
                        <Link href={c.href} className="cursor-pointer w-full">{c.title}</Link>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild variant="ghost" size="sm" key={item.title + item.href}>
                {item.external ? <a href={item.href} target="_blank" rel="noopener noreferrer">{item.title}</a> : <Link href={item.href}>{item.title}</Link>}
              </Button>
            ),
          )}
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
