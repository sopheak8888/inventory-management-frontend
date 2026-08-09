"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { ErrorNote } from "@/components/error-note";
import { ItemDialog } from "@/components/item-dialog";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { StockBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { fmtNumber } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { StockStatus } from "@/lib/types";

const PAGE_SIZE = 25;

/** Mirrors the `?status=` values the API filters on — docs/API.md §5. */
const STATUS_OPTIONS: { value: StockStatus | "all"; label: string }[] = [
  { value: "all", label: "Any Status" },
  { value: "in_stock", label: "In Stock" },
  { value: "low", label: "Low" },
  { value: "critical", label: "Critical" },
  { value: "out_of_stock", label: "Out of Stock" },
];

export default function InventoryPage() {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [locationId, setLocationId] = useState<string>("all");
  const [status, setStatus] = useState<StockStatus | "all">("all");
  const [page, setPage] = useState(1);

  const { data: categories } = useApi(() => api.reference.categories(), []);
  const { data: locations } = useApi(() => api.reference.locations(), []);
  const { data: result, error, reload } = useApi(
    () =>
      api.inventory.list({
        search: search || undefined,
        categoryId: categoryId || undefined,
        locationId: locationId === "all" ? undefined : locationId,
        status: status === "all" ? undefined : status,
        page,
        pageSize: PAGE_SIZE,
      }),
    [search, categoryId, locationId, status, page],
  );

  const rows = result?.data ?? [];
  const total = result?.total ?? 0;
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = (page - 1) * PAGE_SIZE + rows.length;

  function selectCategory(id: string) {
    setCategoryId(id);
    setPage(1);
  }

  return (
    <>
      <PageHeader
        title="Inventory"
        actions={
          <ItemDialog
            onSaved={(saved) => {
              // Clear the filters and search for the new SKU, so the item the
              // user just created is the row in front of them. Leaving a filter
              // on that happens to exclude it reads as the save doing nothing.
              setCategoryId("");
              setLocationId("all");
              setStatus("all");
              setSearch(saved.sku);
              setPage(1);
              reload();
            }}
          />
        }
      />

      <div className="flex flex-wrap items-center gap-3 px-6 pt-5 lg:px-9">
        <div className="relative min-w-[220px] flex-1 md:max-w-[340px]">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 opacity-50" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, SKU, or barcode"
            className="bg-secondary pl-8"
            aria-label="Search inventory"
          />
        </div>

        <div
          className="flex max-w-full divide-x divide-border overflow-x-auto border border-border text-[13px]"
          role="radiogroup"
        >
          <FilterChip label="All" active={categoryId === ""} onClick={() => selectCategory("")} />
          {(categories ?? []).map((cat) => (
            <FilterChip
              key={cat.id}
              label={cat.name}
              active={categoryId === cat.id}
              onClick={() => selectCategory(cat.id)}
            />
          ))}
        </div>

        <Select
          value={locationId}
          onValueChange={(v) => {
            setLocationId(v ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px] bg-secondary">
            {/* Base UI renders the raw value unless given a label resolver. */}
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

        <Select
          value={status}
          onValueChange={(v) => {
            setStatus((v as StockStatus | null) ?? "all");
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px] bg-secondary">
            <SelectValue>
              {(v: string) => STATUS_OPTIONS.find((o) => o.value === v)?.label ?? "Any Status"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="px-6 py-5 lg:px-9">
        {error ? <ErrorNote message={error.message} /> : null}

        <Panel>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead className="text-right">On Hand</TableHead>
                  <TableHead className="text-right">Reorder Pt.</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">
                      <Link href={`/inventory/${item.sku}`} className="hover:underline">
                        {item.sku}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link href={`/inventory/${item.sku}`} className="hover:underline">
                        {item.name}
                      </Link>
                    </TableCell>
                    <TableCell>{item.categoryName}</TableCell>
                    <TableCell>{item.locationName}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNumber(item.onHand)}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtNumber(item.reorderPoint)}</TableCell>
                    <TableCell>
                      <StockBadge status={item.status} />
                    </TableCell>
                  </TableRow>
                ))}
                {result && rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                      No items match those filters.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between border-t border-border px-4 py-3 text-[13px]">
            <span className="opacity-60">
              Showing {fmtNumber(from)}–{fmtNumber(to)} of {fmtNumber(total)} items
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button variant="outline" size="sm" disabled={to >= total} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "shrink-0 px-3 py-[7px] transition-colors",
        active ? "bg-primary text-primary-foreground" : "hover:bg-foreground/7",
      )}
    >
      {label}
    </button>
  );
}
