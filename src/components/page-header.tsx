"use client";

import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-6 py-5 lg:px-9">
      <div className="min-w-0">
        {typeof title === "string" ? (
          <h1 className="m-0 text-[26px]">{title}</h1>
        ) : (
          title
        )}
        {subtitle ? <p className="mt-1 text-[13px] opacity-60">{subtitle}</p> : null}
      </div>
      <div className="flex items-center gap-4">
        {actions}
        <UserMenu />
      </div>
    </div>
  );
}

/**
 * The bell was a decorative icon. It now carries the one notification this app
 * actually has — items at or below their reorder point — and leads to them,
 * rather than looking clickable and doing nothing.
 */
function AlertBell() {
  const { user } = useAuth();
  // Scoped to the signed-in user's site, so the badge agrees with the alerts
  // page and the dashboard rather than counting other people's shortages.
  const { data: alerts } = useApi(
    () => api.reorderAlerts.list(user?.locationId ?? undefined),
    [user?.locationId],
  );
  const count = alerts?.length ?? 0;

  return (
    <Link
      href="/reorder-alerts"
      aria-label={count ? `${count} reorder alerts` : "Reorder alerts"}
      className="relative opacity-70 transition-opacity hover:opacity-100"
    >
      <Bell className="size-[19px]" strokeWidth={1.5} />
      {count ? (
        <span className="absolute -top-1.5 -right-1.5 min-w-[16px] rounded-full bg-danger px-1 text-center text-[10px] leading-4 font-semibold text-white">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();

  return (
    <>
      <AlertBell />
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="Account menu"
          className="flex size-[34px] items-center justify-center rounded-full bg-brand-200 text-[13px] font-semibold text-brand-800"
        >
          {user?.initials ?? "—"}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-normal">
            <div className="text-sm font-medium">{user?.name}</div>
            <div className="text-xs text-muted-foreground">{user?.email}</div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void logout()}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
