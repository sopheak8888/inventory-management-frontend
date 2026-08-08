"use client";

import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
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

function UserMenu() {
  const { user, logout } = useAuth();

  return (
    <>
      <Bell className="size-[19px] opacity-70" strokeWidth={1.5} aria-hidden />
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
