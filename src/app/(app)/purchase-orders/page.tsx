"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ErrorNote } from "@/components/error-note";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { PoBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { fmtDate, fmtMoney } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import { cn } from "@/lib/utils";
import type { PoStatus } from "@/lib/types";

const TABS: { value: PoStatus | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "partially_received", label: "Partially Received" },
  { value: "received", label: "Received" },
];

export default function PurchaseOrdersPage() {
  const [status, setStatus] = useState<PoStatus | "">("");
  const { data: orders, error } = useApi(() => api.purchaseOrders.list(status || undefined), [status]);

  return (
    <>
      <PageHeader
        title="Purchase Orders"
        actions={
          <Button>
            <Plus className="size-4" />
            New Purchase Order
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2 px-6 pt-5 lg:px-9">
        <div className="flex divide-x divide-border border border-border text-[13px]" role="tablist">
          {TABS.map((tab) => (
            <button
              key={tab.value || "all"}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              onClick={() => setStatus(tab.value)}
              className={cn(
                "px-3 py-[7px] transition-colors",
                status === tab.value ? "bg-primary text-primary-foreground" : "hover:bg-foreground/7",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 lg:px-9">
        {error ? <ErrorNote message={error.message} /> : null}

        <Panel>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO #</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {(orders ?? []).map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-mono text-xs">{po.number}</TableCell>
                    <TableCell>{po.supplierName}</TableCell>
                    <TableCell>
                      <PoBadge status={po.status} />
                    </TableCell>
                    <TableCell>{fmtDate(po.orderDate)}</TableCell>
                    <TableCell>{fmtDate(po.expectedDate)}</TableCell>
                    <TableCell className="text-right tabular-nums">{po.itemCount}</TableCell>
                    <TableCell className="text-right tabular-nums">{fmtMoney(po.total)}</TableCell>
                    <TableCell className="text-right">
                      {po.status === "sent" || po.status === "partially_received" ? (
                        <Link
                          href={`/purchase-orders/${po.id}/receive`}
                          className="text-[13px] text-primary hover:underline"
                        >
                          Receive
                        </Link>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
                {orders && orders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                      No purchase orders with that status.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </div>
    </>
  );
}
