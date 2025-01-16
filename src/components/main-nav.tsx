"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  ClipboardList,
  FileText,
  Receipt,
  BarChart3,
  Settings,
} from "lucide-react";

const roleBasedItems = {
  OWNER: [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Inventory",
      href: "/inventory",
      icon: Package,
    },
    {
      title: "Quotations",
      href: "/quotations",
      icon: ClipboardList,
    },
    {
      title: "Sales Orders",
      href: "/sales",
      icon: FileText,
    },
    {
      title: "Invoices",
      href: "/invoices",
      icon: Receipt,
    },
    {
      title: "Reports",
      href: "/reports",
      icon: BarChart3,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ],
  ADMIN: [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Inventory",
      href: "/inventory",
      icon: Package,
    },
    {
      title: "Quotations",
      href: "/quotations",
      icon: ClipboardList,
    },
    {
      title: "Sales Orders",
      href: "/sales",
      icon: FileText,
    },
    {
      title: "Invoices",
      href: "/invoices",
      icon: Receipt,
    },
    {
      title: "Reports",
      href: "/reports",
      icon: BarChart3,
    },
  ],
  SALES_OFFICER: [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Quotations",
      href: "/quotations",
      icon: ClipboardList,
    },
    {
      title: "Sales Orders",
      href: "/sales",
      icon: FileText,
    },
  ],
  STOCK_CONTROLLER: [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Inventory",
      href: "/inventory",
      icon: Package,
    },
  ],
  FINANCE: [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      title: "Invoices",
      href: "/invoices",
      icon: Receipt,
    },
    {
      title: "Reports",
      href: "/reports",
      icon: BarChart3,
    },
  ],
  USER: [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
  ],
};

interface MainNavProps extends React.HTMLAttributes<HTMLElement> {}

export function MainNav({ className, ...props }: MainNavProps) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role || "USER";
  const items = roleBasedItems[role as keyof typeof roleBasedItems] || [];

  return (
    <nav className={cn("flex items-center space-x-4 lg:space-x-6", className)} {...props}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center text-sm font-medium transition-colors hover:text-primary",
              pathname === item.href
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {Icon && <Icon className="mr-2 h-4 w-4" />}
            {item.title}
          </Link>
        );
      })}
    </nav>
  );
} 