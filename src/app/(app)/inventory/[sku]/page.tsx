"use client";

import { use } from "react";
import Link from "next/link";
import { ImageIcon } from "lucide-react";
import { AdjustStockDialog } from "@/components/adjust-stock-dialog";
import { ErrorNote } from "@/components/error-note";
import { ItemDialog } from "@/components/item-dialog";
import { PageHeader } from "@/components/page-header";
import { Kicker, Panel, PanelTitle } from "@/components/panel";
import { StockBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { fmtDate, fmtMoney, fmtNumber, fmtSigned } from "@/lib/format";
import { useApi } from "@/lib/use-api";

const MOVEMENT_LABEL = {
  received: "Received",
  sold: "Sold",
  adjusted: "Adjusted",
  transferred: "Transferred",
} as const;

export default function ItemDetailPage({ params }: PageProps<"/inventory/[sku]">) {
  const { sku } = use(params);
  const { data: item, error, reload: reloadItem } = useApi(() => api.inventory.getBySku(sku), [sku]);
  const { data: history, reload: reloadHistory } = useApi(
    () => (item ? api.inventory.movements(item.id) : Promise.resolve([])),
    [item?.id],
  );

  /** An adjustment changes both the item and its ledger, so both are refetched. */
  function refresh() {
    reloadItem();
    reloadHistory();
  }

  if (error) {
    return (
      <>
        <PageHeader title="Item not found" />
        <div className="px-6 py-7 lg:px-9">
          <ErrorNote message={error.message} />
          <Link href="/inventory" className="text-sm text-primary hover:underline">
            ← Back to inventory
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          <div>
            <p className="text-[13px] opacity-60">
              <Link href="/inventory" className="hover:underline">
                Inventory
              </Link>{" "}
              / {item?.name ?? "…"}
            </p>
            <h1 className="mt-0.5 text-[26px]">{item?.name ?? "Loading…"}</h1>
          </div>
        }
        actions={
          // Both need the loaded item, so they appear with it rather than as
          // buttons that would have nothing to act on.
          item ? (
            <div className="flex gap-2">
              <ItemDialog item={item} onSaved={refresh} />
              <AdjustStockDialog item={item} onAdjusted={refresh} />
            </div>
          ) : null
        }
      />

      <div className="grid flex-1 gap-5 px-6 py-7 lg:grid-cols-[260px_1fr] lg:px-9">
        <Panel className="flex flex-col items-center gap-3 p-5">
          <div className="flex aspect-square w-full max-w-[220px] items-center justify-center bg-secondary text-muted-foreground">
            <div className="flex flex-col items-center gap-2 text-[11px]">
              <ImageIcon className="size-7 opacity-50" strokeWidth={1.5} />
              product photo
            </div>
          </div>
          <div className="w-full">
            <Kicker>{item?.sku ?? "—"}</Kicker>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="bg-ink-100 px-2.5 py-[3px] text-[11px] text-ink-800">
                {item?.categoryName ?? "—"}
              </span>
              {item ? <StockBadge status={item.status} /> : null}
            </div>
          </div>
        </Panel>

        <div className="flex min-w-0 flex-col gap-5">
          <Panel className="p-5">
            <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              <Field label="On Hand" value={item ? `${fmtNumber(item.onHand)} units` : "—"} emphasis />
              <Field label="Supplier" value={item?.supplierName ?? "—"} />
              <Field
                label="Location"
                value={item ? `${item.locationName}${item.bin ? ` · ${item.bin}` : ""}` : "—"}
              />
              <Field label="Unit Cost" value={item ? fmtMoney(item.unitCost) : "—"} />
              <Field label="Sell Price" value={item ? fmtMoney(item.sellPrice) : "—"} />
              <Field label="Reorder Point" value={item ? `${fmtNumber(item.reorderPoint)} units` : "—"} />
              <Field label="Reorder Qty" value={item ? `${fmtNumber(item.reorderQty)} units` : "—"} />
              <Field label="Barcode" value={item?.barcode ?? "—"} mono />
            </div>
          </Panel>

          <Panel>
            <PanelTitle className="px-[18px] pt-4">Stock History</PanelTitle>
            <div className="overflow-x-auto">
              <Table className="mt-1.5">
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                    <TableHead>User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(history ?? []).map((mv) => (
                    <TableRow key={mv.id}>
                      <TableCell>{fmtDate(mv.date)}</TableCell>
                      <TableCell>{MOVEMENT_LABEL[mv.type]}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtSigned(mv.change)}
                        {mv.note ? <span className="text-muted-foreground"> → {mv.note}</span> : null}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{fmtNumber(mv.balance)}</TableCell>
                      <TableCell>{mv.userName}</TableCell>
                    </TableRow>
                  ))}
                  {history && history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                        No movements recorded yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

function Field({
  label,
  value,
  emphasis,
  mono,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <div className="text-xs opacity-60">{label}</div>
      <div
        className={
          emphasis
            ? "stat-num mt-1"
            : `mt-0.5 text-sm ${mono ? "font-mono text-[13px]" : ""}`
        }
      >
        {value}
      </div>
    </div>
  );
}
