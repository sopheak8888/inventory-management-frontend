"use client";

import Link from "next/link";
import { TrendingUp } from "lucide-react";
import { ErrorNote } from "@/components/error-note";
import { PageHeader } from "@/components/page-header";
import { Kicker, Panel, PanelTitle } from "@/components/panel";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtMoneyCompact, fmtNumber, fmtPct, fmtSigned, fmtWhen } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { TrendPoint } from "@/lib/types";

const ACTION_LABEL = {
  received: "Received",
  sold: "Sold",
  adjusted: "Adjusted",
  transferred: "Transferred",
} as const;

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, error } = useApi(() => api.dashboard.summary(), []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <>
      <PageHeader
        title={`Good morning, ${user?.name.split(" ")[0] ?? "there"}`}
        subtitle={`${today} · Warehouse A + 2 more locations`}
      />

      <div className="flex-1 px-6 py-7 lg:px-9">
        {error ? <ErrorNote message={error.message} /> : null}

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            kicker="Total SKUs"
            value={data ? fmtNumber(data.totalSkus) : "—"}
            foot={
              data ? (
                <Trend pct={data.totalSkusChangePct} />
              ) : null
            }
          />
          <Stat
            kicker="Low Stock Items"
            value={data ? fmtNumber(data.lowStockItems) : "—"}
            foot={data ? <span className="text-xs opacity-60">across {data.lowStockLocations} locations</span> : null}
          />
          <Stat
            kicker="Open Purchase Orders"
            value={data ? fmtNumber(data.openPurchaseOrders) : "—"}
            foot={data ? <span className="text-xs opacity-60">{data.awaitingReceipt} awaiting receipt</span> : null}
          />
          <Stat
            kicker="Inventory Value"
            value={data ? fmtMoneyCompact(data.inventoryValue) : "—"}
            foot={data ? <Trend pct={data.inventoryValueChangePct} /> : null}
          />
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[2fr_1fr]">
          <Panel className="p-5">
            <PanelTitle className="mb-3.5">Stock Level Trend — 30 days</PanelTitle>
            <TrendChart points={data?.stockTrend ?? []} />
          </Panel>

          <Panel className="flex flex-col gap-2.5 p-[18px]">
            <div className="flex items-baseline justify-between">
              <PanelTitle>Reorder Alerts</PanelTitle>
              <Link href="/reorder-alerts" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </div>
            {(data?.topAlerts ?? []).map((alert) => (
              <div key={alert.id} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="truncate">{alert.itemName}</span>
                <span
                  className={
                    alert.severity === "critical"
                      ? "border border-danger px-2.5 py-[3px] text-[11px] text-danger"
                      : "bg-brand-100 px-2.5 py-[3px] text-[11px] text-brand-800"
                  }
                >
                  {alert.severity === "critical" ? "Critical" : "Low"}
                </span>
              </div>
            ))}
            {!data ? <Skeleton rows={4} /> : null}
          </Panel>
        </div>

        <Panel className="mt-5">
          <PanelTitle className="px-[18px] pt-4">Recent Activity</PanelTitle>
          <Table className="mt-1.5">
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.recentActivity ?? []).map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{ACTION_LABEL[row.type]}</TableCell>
                  <TableCell>{row.itemName}</TableCell>
                  <TableCell>{fmtSigned(row.change)}</TableCell>
                  <TableCell>{row.locationName}</TableCell>
                  <TableCell>{row.userName}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtWhen(row.at)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Panel>
      </div>
    </>
  );
}

function Stat({ kicker, value, foot }: { kicker: string; value: string; foot?: React.ReactNode }) {
  return (
    <Panel className="p-[18px]">
      <Kicker>{kicker}</Kicker>
      <div className="stat-num mt-1.5">{value}</div>
      <div className="mt-1.5 min-h-[18px]">{foot}</div>
    </Panel>
  );
}

function Trend({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span
      className={`flex items-center gap-1 text-xs ${up ? "text-brand-700" : "text-danger"}`}
    >
      <TrendingUp className={`size-3 ${up ? "" : "-scale-y-100"}`} strokeWidth={2} />
      {fmtPct(pct)} vs last month
    </span>
  );
}

/** Inline area chart — a handful of points, so plain SVG beats a chart library. */
function TrendChart({ points, height = 140 }: { points: TrendPoint[]; height?: number }) {
  if (points.length < 2) return <div style={{ height }} className="bg-secondary/40" />;

  const width = 560;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * width;
    const y = height - 20 - ((p.value - min) / span) * (height - 45);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      width="100%"
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Stock level over the last 30 days"
    >
      <polygon points={`${coords.join(" ")} ${width},${height} 0,${height}`} fill="var(--color-brand-100)" />
      <polyline points={coords.join(" ")} fill="none" stroke="var(--primary)" strokeWidth={2} />
    </svg>
  );
}

function Skeleton({ rows }: { rows: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-4 animate-pulse bg-foreground/5" />
      ))}
    </div>
  );
}
