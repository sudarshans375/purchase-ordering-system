// src/components/layout/navbar.tsx — Navigation bar with auth
// Author: Sudarshan Sonawane

"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Truck,
  Menu,
  X,
  ChevronRight,
  LogOut,
  User,
  LogIn,
  History,
} from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/suppliers", label: "Suppliers", icon: Truck },
  { href: "/products", label: "Products", icon: Package },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ShoppingCart },
  { href: "/stock-movements", label: "Stock Movements", icon: History },
  { href: "/users", label: "Users", icon: User },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch current user on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (res.ok) return res.json();
        throw new Error("Not authenticated");
      })
      .then((data) => setUser(data.data?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Keyboard shortcut: Escape to close mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  return (
    <>
      {/* Mobile header */}
      <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/95 backdrop-blur-sm lg:hidden">
        <div className="flex items-center justify-between px-4 h-14">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-zinc-900 tracking-tight">
            <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
              <span className="text-white text-xs font-bold">PO</span>
            </div>
            PO System
          </Link>
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-lg hover:bg-zinc-100 transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-40 h-full w-64 border-r border-zinc-200 bg-white shadow-lg",
          "transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
          "lg:translate-x-0 lg:static lg:z-auto lg:shadow-none lg:min-h-screen",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 h-14 px-5 border-b border-zinc-200">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-900 to-zinc-700 flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">PO</span>
          </div>
          <div className="flex flex-col">
            <Link href="/" className="text-base font-bold text-zinc-900 tracking-tight leading-tight">
              PO System
            </Link>
            <span className="text-[10px] text-zinc-400 font-medium tracking-wider uppercase">
              Purchase Orders
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-3 space-y-1" role="navigation" aria-label="Main navigation">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400",
                  isActive
                    ? "bg-zinc-900 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                )}
                aria-current={isActive ? "page" : undefined}
              >
                <item.icon className={cn(
                  "h-4 w-4 transition-colors",
                  isActive ? "text-white" : "text-zinc-400"
                )} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="h-3 w-3 opacity-60" />}
              </Link>
            );
          })}
        </nav>

        {/* User section at bottom */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-zinc-200">
          {user ? (
            <div className="p-3 space-y-2">
              <div className="flex items-center gap-2.5 px-3 py-2">
                <div className="w-7 h-7 rounded-full bg-zinc-100 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-zinc-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{user.name}</p>
                  <p className="text-[11px] text-zinc-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          ) : (
            <div className="p-3">
              {!loading && (
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
                >
                  <LogIn className="h-4 w-4" />
                  Sign In
                </Link>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
