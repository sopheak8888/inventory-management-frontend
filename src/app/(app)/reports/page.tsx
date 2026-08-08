"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { ErrorNote } from "@/components/error-note";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelTitle } from "@/components/panel";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { fmtMoneyCompact } from "@/lib/format";
import { useApi } from "@/lib/use-api";

const RANGES = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
];

/** Quote anything containing a comma, quote or newline; double inner quotes. */
function csvCell(value: string | number) {
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export default function ReportsPage() {
  const [range, setRange] = useState("30d");
  const [locationId, setLocationId] = useState("all");

  const { data: locations } = useApi(() => api.reference.locations(), []);
  const { data, error } = useApi(
    () =>
      api.reports.summary({
        from: range,
        locationId: locationId === "all" ? undefined : locationId,
      }),
    [range, locationId],
  );

  const trend = data?.inventoryValueTrend ?? [];
  const maxTurnover = Math.max(...(data?.turnoverByCategory ?? [{ turnover: 1 }]).map((c) => c.turnover));

  /**
   * The report is already in the browser, so the export is a Blob download
   * rather than a round trip — no endpoint, and it exports exactly the figures
   * on screen, filters included.
   */
  function exportCsv() {
    if (!data) return;
    const locationName =
      locationId === "all" ? "All locations" : (locations?.find((l) => l.id === locationId)?.name ?? locationId);

    const rows: (string | number)[][] = [
      ["Stocklane report"],
      ["Range", RANGES.find((r) => r.value === range)?.label ?? range],
      ["Location", locationName],
      [],
      ["Inventory value trend"],
      ["Date", "Value"],
      ...trend.map((point) => [point.date, point.value]),
      [],
      ["Turnover by category"],
      ["Category", "Turnover (0-1)"],
      ...data.turnoverByCategory.map((cat) => [cat.label, cat.turnover]),
      [],
      ["Top movers"],
      ["Item", "Change %"],
      ...data.topMovers.map((mover) => [mover.itemName, mover.changePct]),
    ];

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `stocklane-report-${range}-${locationId}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Report exported.");
  }

  return (
    <>
      <PageHeader
        title="Reports"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={range} onValueChange={(v) => setRange(v ?? "30d")}>
              <SelectTrigger className="w-[160px] bg-secondary">
                <SelectValue>
                  {(v: string) => RANGES.find((r) => r.value === v)?.label ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={locationId} onValueChange={(v) => setLocationId(v ?? "all")}>
              <SelectTrigger className="w-[170px] bg-secondary">
                <SelectValue>
                  {(v: string) =>
                    v === "all" ? "All Locations" : (locations?.find((l) => l.id === v)?.name ?? "…")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                {(locations ?? []).map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCsv} disabled={!data}>
              <Download className="size-4" />
              Export
            </Button>
          </div>
        }
      />

      <div className="px-6 py-7 lg:px-9">
        {error ? <ErrorNote message={error.message} /> : null}

        <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
          <Panel className="p-5">
            <PanelTitle>Inventory Value Trend</PanelTitle>
            <p className="mt-1 text-[13px] opacity-60">
              {data
                ? `${fmtMoneyCompact(data.valueFrom)} → ${fmtMoneyCompact(data.valueTo)} over the period`
                : "—"}
            </p>
            <svg
              viewBox="0 0 560 180"
              preserveAspectRatio="none"
              className="mt-4 h-[180px] w-full"
              role="img"
              aria-label="Inventory value trend"
            >
              {trend.length > 1
                ? (() => {
                    const values = trend.map((p) => p.value);
                    const min = Math.min(...values);
                    const span = Math.max(...values) - min || 1;
                    const pts = trend.map((p, i) => {
                      const x = (i / (trend.length - 1)) * 560;
                      const y = 160 - ((p.value - min) / span) * 130;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    });
                    return (
                      <>
                        <polygon points={`${pts.join(" ")} 560,180 0,180`} fill="var(--color-brand-100)" />
                        <polyline points={pts.join(" ")} fill="none" stroke="var(--primary)" strokeWidth={2} />
                      </>
                    );
                  })()
                : null}
            </svg>
          </Panel>

          <Panel className="p-5">
            <PanelTitle>Turnover by Category</PanelTitle>
            {/* items-stretch, not items-end: the columns need a definite height
                for the bars' percentage heights to resolve against. */}
            <div className="mt-5 flex h-[180px] items-stretch gap-3">
              {(data?.turnoverByCategory ?? []).map((cat) => (
                <div key={cat.categoryId} className="flex flex-1 flex-col justify-end gap-2">
                  <div
                    className="w-full bg-primary"
                    style={{ height: `${(cat.turnover / maxTurnover) * 100}%` }}
                    title={`${cat.label}: ${(cat.turnover * 100).toFixed(0)}%`}
                  />
                  <span className="text-center text-[11px] opacity-60">{cat.label}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <Panel className="mt-5 p-5">
          <PanelTitle>Top Movers</PanelTitle>
          <div className="mt-3 flex flex-col gap-2.5">
            {(data?.topMovers ?? []).map((mover) => (
              <div key={mover.itemId} className="flex items-center justify-between text-[13px]">
                <span>{mover.itemName}</span>
                <span className={mover.changePct >= 0 ? "text-brand-700" : "text-danger"}>
                  {mover.changePct >= 0 ? "↑" : "↓"} {Math.abs(mover.changePct)}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}
