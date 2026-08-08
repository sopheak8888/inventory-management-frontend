"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("jordan@stocklane.co");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand panel — blueprint grid, hidden on small screens */}
      <div className="relative hidden flex-1 overflow-hidden border-r border-border bg-secondary lg:block">
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "linear-gradient(to right, var(--border) 1px, transparent 1px), linear-gradient(to bottom, var(--border) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2.5">
            <div className="size-[26px] flex-none border border-brand-800 bg-primary" />
            <span className="font-heading text-[19px] font-semibold">Stocklane</span>
          </div>
          <div className="max-w-md">
            <h2 className="text-[38px]">Every SKU, every aisle, one source of truth.</h2>
            <p className="mt-3 text-sm opacity-70">
              Track stock across warehouses and stores, catch reorder points before they bite, and
              receive shipments straight from the floor.
            </p>
          </div>
          <p className="text-[11px] uppercase tracking-[0.1em] opacity-45">
            Warehouse A · Warehouse B · Store 12
          </p>
        </div>
      </div>

      {/* Sign-in form */}
      <div className="flex flex-1 items-center justify-center p-6">
        <Panel className="w-full max-w-[380px] p-8">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <div className="size-[26px] flex-none border border-brand-800 bg-primary" />
            <span className="font-heading text-[19px] font-semibold">Stocklane</span>
          </div>

          <h1 className="text-[28px]">Sign in</h1>
          <p className="mt-1 mb-6 text-[13px] opacity-60">
            Use your work account to continue.
          </p>

          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div className="grid gap-1.5">
              <Label htmlFor="email" className="text-xs opacity-70">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@stocklane.co"
                className="bg-secondary"
              />
            </div>

            <div className="grid gap-1.5">
              <div className="flex items-baseline justify-between">
                <Label htmlFor="password" className="text-xs opacity-70">
                  Password
                </Label>
                <a href="#" className="text-xs text-primary hover:underline">
                  Forgot password?
                </a>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="bg-secondary"
              />
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-[13px]">
              <Checkbox defaultChecked className="border-border" />
              Keep me signed in
            </label>

            {error ? (
              <p role="alert" className="border border-danger px-3 py-2 text-[13px] text-danger">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={submitting} className="mt-1 w-full">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              {submitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <p className="mt-6 border-t border-border pt-4 text-[11px] leading-relaxed opacity-55">
            Seeded accounts — password <code className="font-mono">stocklane</code>:{" "}
            <code className="font-mono">jordan@stocklane.co</code> (Admin),{" "}
            <code className="font-mono">mia@stocklane.co</code> (Manager),{" "}
            <code className="font-mono">andre@stocklane.co</code> (Staff).
          </p>
        </Panel>
      </div>
    </div>
  );
}
