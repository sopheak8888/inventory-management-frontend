"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ErrorNote } from "@/components/error-note";
import { PageHeader } from "@/components/page-header";
import { Kicker, Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import type { ReceiptCondition, ReceiptLineInput } from "@/lib/types";

export default function ReceiveShipmentPage({
  params,
}: PageProps<"/purchase-orders/[id]/receive">) {
  const { id } = use(params);
  const router = useRouter();
  const { data: po, error } = useApi(() => api.purchaseOrders.get(id), [id]);

  // Only the exceptions are stored: every row defaults to "expected qty, good".
  const [edits, setEdits] = useState<Record<string, Partial<ReceiptLineInput>>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Default to what's still outstanding, not the full expected quantity — on a
  // partially received order those differ, and pre-filling the full amount makes
  // every line an over-receipt the server rejects.
  const outstanding = (line: { expectedQty: number; receivedQty: number }) =>
    Math.max(0, line.expectedQty - line.receivedQty);

  const lines: Record<string, ReceiptLineInput> = Object.fromEntries(
    (po?.lines ?? []).map((line) => [
      line.id,
      {
        lineId: line.id,
        receivedQty: outstanding(line),
        condition: "good" as ReceiptCondition,
        ...edits[line.id],
      },
    ]),
  );

  function update(lineId: string, patch: Partial<ReceiptLineInput>) {
    setEdits((prev) => ({ ...prev, [lineId]: { ...prev[lineId], ...patch } }));
  }

  async function onConfirm() {
    if (!po) return;
    setSubmitting(true);
    try {
      await api.purchaseOrders.receive({
        purchaseOrderId: po.id,
        lines: Object.values(lines),
        notes: notes || undefined,
      });
      toast.success(`Receipt confirmed for ${po.number}.`);
      router.push("/purchase-orders");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not confirm the receipt.");
      setSubmitting(false);
    }
  }

  if (error) {
    return (
      <>
        <PageHeader title="Receive Shipment" />
        <div className="px-6 py-7 lg:px-9">
          <ErrorNote message={error.message} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={
          <div>
            <Kicker>Against Purchase Order</Kicker>
            <h1 className="mt-1 text-[26px]">Receive Shipment</h1>
          </div>
        }
      />

      <div className="px-6 py-7 lg:px-9">
        <Panel className="p-5">
          <div className="font-heading text-[17px] font-semibold">
            {po ? `${po.number} — ${po.supplierName}` : "Loading…"}
          </div>

          <div className="mt-4 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Expected</TableHead>
                  <TableHead className="w-[140px]">Received</TableHead>
                  <TableHead className="w-[200px]">Condition</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(po?.lines ?? []).map((line) => {
                  const entry = lines[line.id];
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div>{line.itemName}</div>
                        <div className="font-mono text-[11px] text-muted-foreground">{line.sku}</div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {line.expectedQty}
                        {line.receivedQty > 0 ? (
                          <div className="text-[11px] text-muted-foreground">
                            {line.receivedQty} already received
                          </div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          aria-label={`Received quantity for ${line.itemName}`}
                          value={entry?.receivedQty ?? ""}
                          onChange={(e) => update(line.id, { receivedQty: Number(e.target.value) })}
                          className="bg-secondary"
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={entry?.condition ?? "good"}
                          onValueChange={(v) => update(line.id, { condition: v as ReceiptCondition })}
                        >
                          <SelectTrigger className="w-full bg-secondary">
                            <SelectValue>
                              {(v: string) => (v === "damaged" ? "Damaged" : "Good")}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="good">Good</SelectItem>
                            <SelectItem value="damaged">Damaged</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {po && po.lines.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      This purchase order has no open lines to receive.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>

          <div className="mt-5 grid gap-1.5">
            <Label htmlFor="notes" className="text-xs opacity-70">
              Notes
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 2 cases of crackers arrived crushed — logged for supplier credit."
              className="bg-secondary"
            />
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => router.back()} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={submitting || !po || po.lines.length === 0}>
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Confirm Receipt
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
