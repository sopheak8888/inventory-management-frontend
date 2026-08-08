"use client";

import { useState } from "react";
import { ErrorNote } from "@/components/error-note";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelTitle } from "@/components/panel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { fmtDate, fmtNumber } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { BinCell } from "@/lib/types";

const LEGEND = [
  { label: "Empty", className: "bg-ink-200" },
  { label: "Low", className: "bg-brand-300" },
  { label: "Medium", className: "bg-brand-600" },
  { label: "Full", className: "bg-brand-800" },
];

/** fill (0–1) → the four occupancy buckets the legend describes. */
function bucket(fill: number) {
  if (fill <= 0.05) return "bg-ink-200";
  if (fill < 0.5) return "bg-brand-300";
  if (fill < 0.85) return "bg-brand-600";
  return "bg-brand-800";
}

export default function WarehouseMapPage() {
  const [locationId, setLocationId] = useState("loc-a");
  const [selected, setSelected] = useState<BinCell | null>(null);

  const { data: locations } = useApi(() => api.reference.locations(), []);
  const { data: map, error } = useApi(() => api.warehouse.map(locationId), [locationId]);

  const detail = selected ?? map?.cells.find((c) => c.itemName) ?? null;

  return (
    <>
      <PageHeader
        title="Warehouse Map"
        actions={
          <Select
            value={locationId}
            onValueChange={(v) => {
              setLocationId(v ?? "loc-a");
              setSelected(null);
            }}
          >
            <SelectTrigger className="w-[200px] bg-secondary">
              <SelectValue>
                {(v: string) => locations?.find((l) => l.id === v)?.name ?? "…"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(locations ?? []).map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid flex-1 gap-6 px-6 py-6 lg:grid-cols-[1fr_300px] lg:px-9">
        <div>
          {error ? <ErrorNote message={error.message} /> : null}
          <Panel className="p-5">
            <PanelTitle className="mb-3.5">Aisle Occupancy</PanelTitle>
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${map?.columns ?? 10}, minmax(0, 1fr))` }}
            >
              {(map?.cells ?? []).map((cell) => (
                <button
                  key={cell.id}
                  type="button"
                  onClick={() => setSelected(cell)}
                  aria-label={`${cell.label}, ${Math.round(cell.fill * 100)}% full`}
                  className={`h-[34px] transition-opacity hover:opacity-80 ${bucket(cell.fill)} ${
                    detail?.id === cell.id ? "outline-2 outline-offset-1 outline-brand-900" : ""
                  }`}
                />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-xs opacity-70">
              {LEGEND.map((l) => (
                <span key={l.label} className="flex items-center gap-1.5">
                  <i className={`inline-block size-2.5 ${l.className}`} />
                  {l.label}
                </span>
              ))}
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel className="p-4">
            <PanelTitle className="mb-2.5 text-[15px]">Locations</PanelTitle>
            <div className="flex flex-col gap-2.5 text-[13px]">
              {(locations ?? []).map((loc) => (
                <div key={loc.id}>
                  <div className="flex justify-between">
                    <span>{loc.name}</span>
                    <span className="text-muted-foreground">{fmtNumber(loc.skuCount)} SKUs</span>
                  </div>
                  <div className="mt-1 h-1 bg-ink-200">
                    <div className="h-full bg-primary" style={{ width: `${loc.utilisation * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel className="p-4">
            <PanelTitle className="mb-2 text-[15px]">{detail?.label ?? "Select a bin"}</PanelTitle>
            {detail ? (
              <>
                <div className="text-[13px]">{detail.itemName ?? "Unassigned bin"}</div>
                <div className="mt-1 text-xs opacity-60">
                  {fmtNumber(detail.units)} units
                  {detail.lastCountedAt ? ` · Last counted ${fmtDate(detail.lastCountedAt)}` : ""}
                </div>
              </>
            ) : (
              <p className="text-[13px] opacity-60">Click a cell on the map to inspect it.</p>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
