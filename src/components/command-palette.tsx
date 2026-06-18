// src/components/command-palette.tsx — Global Ctrl/Cmd-K command palette (cmdk)
// Author: Sudarshan Sonawane

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  LayoutDashboard,
  Truck,
  Package,
  ShoppingCart,
  History,
  Plus,
  Users,
  Search,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  group: string;
  icon: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  action: () => void;
}

const STATIC_COMMANDS: Omit<CommandItem, "action">[] = [
  { id: "go-dashboard", label: "Go to Dashboard", group: "Navigate", icon: LayoutDashboard, shortcut: "G D" },
  { id: "go-suppliers", label: "Go to Suppliers", group: "Navigate", icon: Truck, shortcut: "G S" },
  { id: "go-products", label: "Go to Products", group: "Navigate", icon: Package, shortcut: "G P" },
  { id: "go-pos", label: "Go to Purchase Orders", group: "Navigate", icon: ShoppingCart, shortcut: "G O" },
  { id: "go-movements", label: "Go to Stock Movements", group: "Navigate", icon: History },
  { id: "go-users", label: "Go to Users", group: "Navigate", icon: Users },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  // Toggle with Ctrl/Cmd+K
  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const commands: CommandItem[] = React.useMemo(
    () => [
      ...STATIC_COMMANDS.map((c) => ({
        ...c,
        action: () => {
          const path = c.id.replace(/^go-/, "/").replace(/-/g, "-");
          const routeMap: Record<string, string> = {
            "go-dashboard": "/",
            "go-suppliers": "/suppliers",
            "go-products": "/products",
            "go-pos": "/purchase-orders",
            "go-movements": "/stock-movements",
            "go-users": "/users",
          };
          router.push(routeMap[c.id] ?? path);
          setOpen(false);
        },
      })),
      {
        id: "new-po",
        label: "Create New Purchase Order",
        group: "Actions",
        icon: Plus,
        shortcut: "N",
        action: () => {
          router.push("/purchase-orders?new=1");
          setOpen(false);
        },
      },
    ],
    [router]
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="p-0 sm:max-w-xl overflow-hidden">
        <Command
          className="[&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input]]:h-12 [&_[cmdk-input]]:px-4 [&_[cmdk-item]]:px-3 [&_[cmdk-item]]:py-2 [&_[cmdk-item]]:rounded-md [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-zinc-500 [&_[cmdk-group-heading]]:uppercase"
          label="Global command palette"
        >
          <div className="flex items-center border-b border-zinc-200 dark:border-zinc-800 px-3">
            <Search className="h-4 w-4 text-zinc-400 mr-2 shrink-0" />
            <Command.Input
              autoFocus
              placeholder="Type a command or search…"
              className="flex h-12 w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            />
          </div>
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-zinc-500">
              No results found.
            </Command.Empty>
            {["Navigate", "Actions"].map((group) => {
              const items = commands.filter((c) => c.group === group);
              if (items.length === 0) return null;
              return (
                <Command.Group key={group} heading={group}>
                  {items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Command.Item
                        key={item.id}
                        value={item.label}
                        onSelect={item.action}
                        className="flex items-center gap-3 cursor-pointer aria-selected:bg-zinc-100 dark:aria-selected:bg-zinc-800"
                      >
                        <Icon className="h-4 w-4 text-zinc-500 shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {item.shortcut && (
                          <kbd className="text-xs text-zinc-400 font-mono">
                            {item.shortcut}
                          </kbd>
                        )}
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              );
            })}
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  );
}