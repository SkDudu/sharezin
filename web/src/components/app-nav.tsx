"use client";

import { useConvexAuth } from "convex/react";
import { Home, Plus, Receipt, User, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/receipts", label: "Recibos", icon: Receipt },
  { href: "/groups", label: "Grupos", icon: Users },
  { href: "/profile", label: "Perfil", icon: User },
] as const;

function isActive(pathname: string, href: string) {
  if (
    href === "/receipts" &&
    (pathname === "/receipt/new" ||
      (pathname.startsWith("/receipt/") && pathname !== "/receipt/new"))
  ) {
    return true;
  }
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}

function hideAuth(pathname: string) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/forgot")
  );
}

function isReceiptDetail(pathname: string) {
  return (
    pathname.startsWith("/receipt/") && pathname !== "/receipt/new"
  );
}

function isNewReceipt(pathname: string) {
  return pathname === "/receipt/new";
}

/** Desktop sidebar + mobile 4-tab nav — Paper FAB variants (no center +). */
export function AppNav() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useConvexAuth();

  if (isLoading || !isAuthenticated || hideAuth(pathname)) {
    return null;
  }

  const showSidebar = !hideAuth(pathname);
  const showMobileNav =
    !isReceiptDetail(pathname) && !isNewReceipt(pathname);

  return (
    <>
      {showSidebar ? (
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col justify-between border-r border-border bg-card px-5 py-8 print:hidden md:flex">
          <div className="flex flex-col gap-8">
            <p className="font-display px-2 text-[22px] leading-7 font-extrabold tracking-tight text-foreground">
              Sharezin
            </p>
            <nav className="flex flex-col gap-1">
              {tabs.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      "flex h-11 items-center gap-3 rounded-lg px-3.5 text-sm transition-colors",
                      active
                        ? "bg-primary font-semibold text-primary-foreground"
                        : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    <Icon
                      className="size-[18px]"
                      strokeWidth={active ? 2.2 : 1.8}
                    />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <Link
            href={pathname.startsWith("/groups") ? "/groups" : "/receipt/new"}
            onClick={(e) => {
              if (pathname.startsWith("/groups")) {
                e.preventDefault();
                window.dispatchEvent(new Event("sharezin:focus-create-group"));
              }
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-foreground"
          >
            <Plus className="size-[18px]" strokeWidth={2.5} />
            {pathname.startsWith("/groups") ? "Novo grupo" : "Novo recibo"}
          </Link>
        </aside>
      ) : null}

      {showMobileNav ? (
        <nav className="fixed inset-x-0 bottom-0 z-40 px-5 pb-5 print:hidden md:hidden">
          <ul className="mx-auto flex h-[72px] max-w-lg items-center justify-between rounded-2xl border border-border bg-card px-5">
            {tabs.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <li key={href} className="w-12 shrink-0">
                  <Link
                    href={href}
                    className="flex flex-col items-center gap-1"
                  >
                    <span
                      className={cn(
                        "flex size-9 items-center justify-center rounded-full",
                        active && "bg-primary",
                      )}
                    >
                      <Icon
                        className={cn(
                          "size-[18px]",
                          active
                            ? "text-primary-foreground"
                            : "text-muted-foreground",
                        )}
                        strokeWidth={active ? 2.2 : 1.8}
                      />
                    </span>
                    <span
                      className={cn(
                        "text-[11px] leading-[14px]",
                        active
                          ? "font-semibold text-primary"
                          : "font-medium text-muted-foreground",
                      )}
                    >
                      {label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      ) : null}
    </>
  );
}
