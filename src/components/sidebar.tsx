"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Settings,
  ChevronLeft,
  Diamond,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  userRole?: string;
}

const navigation = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    module: null,
  },
  {
    name: "Stock",
    href: "/stock",
    icon: Package,
    module: "stock",
  },
  {
    name: "Purchases",
    href: "/purchases",
    icon: ShoppingCart,
    module: "purchases",
  },
  {
    name: "Sales",
    href: "/sales",
    icon: TrendingUp,
    module: "sales",
  },
  {
    name: "Invoices",
    href: "/invoices",
    icon: TrendingUp,
    module: "sales",
  },
  {
    name: "Contacts",
    href: "/contacts",
    icon: Users,
    module: "contacts",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    module: "settings",
    adminOnly: true,
  },
];

export function Sidebar({ collapsed, onToggle, userRole }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const filteredNav = navigation.filter(
    (item) => !item.adminOnly || userRole === "admin"
  );

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-background flex flex-col transition-sidebar",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      {/* Logo Area */}
      <div
        className={cn(
          "flex items-center h-16 border-b border-border px-4",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-zinc-800 to-zinc-900 shrink-0">
            <Diamond className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <span className="font-semibold text-sm tracking-tight truncate">
              Diamond Trading
            </span>
          )}
        </Link>
        {!collapsed && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const active = isActive(item.href);
          const linkContent = (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger render={linkContent} />
                <TooltipContent side="right" sideOffset={8}>
                  {item.name}
                </TooltipContent>
              </Tooltip>
            );
          }

          return linkContent;
        })}
      </nav>

      {/* Collapse Toggle (when collapsed) */}
      {collapsed && (
        <div className="py-4 px-3 border-t border-border">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggle}
            className="w-full text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
          </Button>
        </div>
      )}
    </aside>
  );
}
