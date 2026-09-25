"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Settings,
  ChevronLeft,
  ChevronDown,
  Diamond,
  type LucideIcon,
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

type NavChild = {
  name: string;
  href: string;
  match?: (pathname: string, search: string) => boolean;
};

type NavItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  module?: string | null;
  adminOnly?: boolean;
  children?: NavChild[];
};

const navigation: NavItem[] = [
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
    children: [
      {
        name: "Inventory",
        href: "/stock",
        match: (pathname) => pathname === "/stock",
      },
      {
        name: "Upload Stock",
        href: "/stock/upload",
        match: (pathname) => pathname.startsWith("/stock/upload"),
      },
      {
        name: "Adjust Stock",
        href: "/stock/adjust",
        match: (pathname) => pathname.startsWith("/stock/adjust"),
      },
    ],
  },
  {
    name: "Purchases",
    href: "/purchases",
    icon: ShoppingCart,
    module: "purchases",
    children: [
      {
        name: "Purchase Memo",
        href: "/purchases",
        match: (pathname) =>
          pathname === "/purchases" ||
          pathname === "/purchases/new" ||
          /^\/purchases\/[^/]+$/.test(pathname),
      },
      {
        name: "Memo Return",
        href: "/purchases/returns",
        match: (pathname) =>
          pathname.startsWith("/purchases/returns") ||
          pathname.endsWith("/return"),
      },
      {
        name: "Bills",
        href: "/purchases/bills",
        match: (pathname) => pathname.startsWith("/purchases/bills"),
      },
    ],
  },
  {
    name: "Sales",
    href: "/sales",
    icon: TrendingUp,
    module: "sales",
    children: [
      {
        name: "Sales Memo",
        href: "/sales",
        match: (pathname) =>
          pathname === "/sales" ||
          pathname === "/sales/new" ||
          /^\/sales\/[^/]+$/.test(pathname),
      },
      {
        name: "Memo Return",
        href: "/sales/returns",
        match: (pathname) => pathname.startsWith("/sales/returns"),
      },
      {
        name: "Invoice",
        href: "/invoices",
        match: (pathname) =>
          pathname === "/invoices" || /^\/invoices\/[^/]+$/.test(pathname),
      },
      {
        name: "Customer Payment",
        href: "/payments",
        match: (pathname) =>
          pathname.startsWith("/payments") || pathname.endsWith("/payment"),
      },
    ],
  },
  {
    name: "Contacts",
    href: "/contacts",
    icon: Users,
    module: "contacts",
    children: [
      {
        name: "All Contacts",
        href: "/contacts",
        match: (pathname, search) =>
          pathname.startsWith("/contacts") &&
          !new URLSearchParams(search).get("type"),
      },
      {
        name: "Customers",
        href: "/contacts?type=customer",
        match: (pathname, search) =>
          pathname.startsWith("/contacts") &&
          new URLSearchParams(search).get("type") === "customer",
      },
      {
        name: "Vendors",
        href: "/contacts?type=vendor",
        match: (pathname, search) =>
          pathname.startsWith("/contacts") &&
          new URLSearchParams(search).get("type") === "vendor",
      },
    ],
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    module: "settings",
    adminOnly: true,
    children: [
      { name: "Users & Permissions", href: "/settings" },
    ],
  },
];

function isChildActive(child: NavChild, pathname: string, search: string) {
  if (child.match) return child.match(pathname, search);
  const url = new URL(child.href, "http://local");
  if (pathname !== url.pathname) {
    return pathname.startsWith(url.pathname + "/");
  }
  const expectedType = url.searchParams.get("type");
  const currentType = new URLSearchParams(search).get("type");
  return expectedType === currentType;
}

function isGroupActive(item: NavItem, pathname: string, search: string) {
  if (item.href === "/") return pathname === "/";
  if (item.children?.length) {
    return item.children.some((child) => isChildActive(child, pathname, search));
  }
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function Sidebar({ collapsed, onToggle, userRole }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const search = searchParams.toString();
  const [userToggled, setUserToggled] = useState<Record<string, boolean>>({});
  const openGroups = useMemo(() => {
    const next = { ...userToggled };
    for (const item of navigation) {
      if (item.children && isGroupActive(item, pathname, search) && !(item.name in userToggled)) {
        next[item.name] = true;
      }
    }
    return next;
  }, [pathname, search, userToggled]);

  const filteredNav = navigation.filter(
    (item) => !item.adminOnly || userRole === "admin" || userRole === "super_admin"
  );

  const toggleGroup = (name: string) => {
    if (collapsed) {
      onToggle();
      setUserToggled((prev) => ({ ...prev, [name]: true }));
      return;
    }
    setUserToggled((prev) => ({ ...prev, [name]: !openGroups[name] }));
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen border-r border-border bg-background flex flex-col transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
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

      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {filteredNav.map((item) => {
          const groupActive = isGroupActive(item, pathname, search);
          const hasChildren = Boolean(item.children?.length);
          const isOpen = !collapsed && hasChildren && openGroups[item.name];

          const parentButton = hasChildren ? (
            <button
              type="button"
              onClick={() => toggleGroup(item.name)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                groupActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.name}</span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 shrink-0 transition-transform",
                      isOpen ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </>
              )}
            </button>
          ) : (
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                groupActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className={cn("shrink-0", collapsed ? "w-5 h-5" : "w-4 h-4")} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          );

          const content = (
            <div key={item.name}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      hasChildren ? (
                        <button
                          type="button"
                          onClick={() => toggleGroup(item.name)}
                          className={cn(
                            "flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                            groupActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="w-5 h-5 shrink-0" />
                        </button>
                      ) : (
                        <Link
                          href={item.href}
                          className={cn(
                            "flex w-full items-center justify-center rounded-lg px-2 py-2 text-sm font-medium transition-colors",
                            groupActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          )}
                        >
                          <item.icon className="w-5 h-5 shrink-0" />
                        </Link>
                      )
                    }
                  />
                  <TooltipContent side="right" sideOffset={8}>
                    {item.name}
                  </TooltipContent>
                </Tooltip>
              ) : (
                parentButton
              )}

              {isOpen && item.children && (
                <div className="mt-1 ml-5 border-l border-border pl-3 space-y-0.5">
                  {item.children.map((child) => {
                    const childActive = isChildActive(child, pathname, search);
                    return (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={cn(
                          "flex items-center rounded-md px-2 py-1.5 text-sm transition-colors",
                          childActive
                            ? "bg-muted font-medium text-foreground"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                        )}
                      >
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );

          return content;
        })}
      </nav>

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
