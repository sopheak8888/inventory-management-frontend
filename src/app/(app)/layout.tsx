"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { readSession } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/**
 * Client-side guard. Once a real backend exists, move this to `middleware.ts`
 * reading an httpOnly cookie so protected pages never render for a signed-out
 * visitor — see docs/API.md §Authentication.
 *
 * The stored session is checked directly rather than trusting `user` alone: the
 * first client render is the hydration render, where the auth store still
 * reports the server snapshot (null) even for a signed-in visitor. Redirecting
 * on that render sent anyone who refreshed or opened a link to a deep page to
 * /login, which then bounced them to /dashboard — so no protected URL survived
 * a page load.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user && !readSession()) router.replace("/login");
  }, [user, router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  );
}
