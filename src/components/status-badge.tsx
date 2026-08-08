import { cn } from "@/lib/utils";
import type { PoStatus, StockStatus, UserStatus } from "@/lib/types";

const stock: Record<StockStatus, { label: string; className: string }> = {
  in_stock: { label: "In Stock", className: "bg-ink-100 text-ink-800" },
  low: { label: "Low", className: "bg-brand-100 text-brand-800" },
  critical: { label: "Critical", className: "border border-danger text-danger" },
  out_of_stock: { label: "Out of Stock", className: "border border-danger bg-danger/10 text-danger" },
};

const po: Record<PoStatus, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-ink-100 text-ink-800" },
  sent: { label: "Sent", className: "bg-brand-100 text-brand-800" },
  partially_received: { label: "Partially Received", className: "border border-primary text-primary" },
  received: { label: "Received", className: "bg-ink-100 text-ink-800" },
  cancelled: { label: "Cancelled", className: "border border-danger text-danger" },
};

const account: Record<UserStatus, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-brand-100 text-brand-800" },
  invited: { label: "Invited", className: "border border-border text-muted-foreground" },
  disabled: { label: "Disabled", className: "bg-ink-100 text-ink-600" },
};

const base = "inline-flex items-center px-2.5 py-[3px] text-[11px] tracking-[0.02em] whitespace-nowrap";

export function StockBadge({ status, className }: { status: StockStatus; className?: string }) {
  const s = stock[status];
  return <span className={cn(base, s.className, className)}>{s.label}</span>;
}

export function PoBadge({ status, className }: { status: PoStatus; className?: string }) {
  const s = po[status];
  return <span className={cn(base, s.className, className)}>{s.label}</span>;
}

export function AccountBadge({ status, className }: { status: UserStatus; className?: string }) {
  const s = account[status];
  return <span className={cn(base, s.className, className)}>{s.label}</span>;
}
