"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutGrid,
  Package,
  ScanLine,
  Settings,
  TriangleAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/purchase-orders", label: "Purchase Orders", icon: ClipboardList },
  { href: "/reorder-alerts", label: "Reorder Alerts", icon: TriangleAlert },
  { href: "/scan", label: "Scan", icon: ScanLine },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/warehouse-map", label: "Warehouse Map", icon: Boxes },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    // Below md the rail collapses to icons rather than disappearing — no drawer,
    // no state, still navigable on a phone.
    <aside className="flex w-[60px] flex-none flex-col border-r border-border bg-secondary py-5 md:w-[220px]">
      <div className="flex items-center gap-2.5 px-[17px] pb-5 md:px-5">
        <div className="size-[26px] flex-none border border-brand-800 bg-primary" />
        <span className="hidden font-heading text-[19px] font-semibold md:inline">Stocklane</span>
      </div>

      {NAV.map(({ href, label, icon: Icon }) => (
        <SidebarLink key={href} href={href} label={label} Icon={Icon} active={isActive(href)} />
      ))}

      <SidebarLink
        href="/settings"
        label="Settings"
        Icon={Settings}
        active={isActive("/settings")}
        className="mt-auto"
      />
    </aside>
  );
}

function SidebarLink({
  href,
  label,
  Icon,
  active,
  className,
}: {
  href: string;
  label: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  className?: string;
}) {
  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 border-l-2 border-transparent px-[17px] py-2.5 text-sm transition-colors md:px-5",
        active
          ? "border-l-primary bg-brand-100 text-brand-800"
          : "text-foreground hover:bg-foreground/5",
        className,
      )}
    >
      <Icon className={cn("size-4 flex-none", active ? "opacity-100" : "opacity-80")} strokeWidth={1.5} />
      <span className="hidden md:inline">{label}</span>
    </Link>
  );
}
