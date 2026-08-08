"use client";

import { useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api, ApiError } from "@/lib/api";
import { fmtMoney } from "@/lib/format";
import { useApi } from "@/lib/use-api";

interface Line {
  itemId: string;
  qty: string;
}

/**
 * Supplier first, then items — the API refuses a line whose item comes from a
 * different supplier, so the item list is filtered to that supplier's catalogue
 * rather than letting the user assemble an order the server will reject.
 *
 * ponytail: the item picker loads the supplier's first 200 SKUs, which covers
 * every seeded supplier. Swap it for a typeahead against `?search=` if a
 * supplier's catalogue outgrows one page.
 */
export function NewPurchaseOrderDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [lines, setLines] = useState<Line[]>([{ itemId: "", qty: "" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: suppliers } = useApi(() => api.reference.suppliers(), []);
  const { data: catalogue } = useApi(
    () =>
      supplierId
        ? api.inventory.list({ pageSize: 200 }).then((page) => page.data)
        : Promise.resolve([]),
    [supplierId],
  );

  const forSupplier = (catalogue ?? []).filter((item) => item.supplierId === supplierId);
  const total = lines.reduce((sum, line) => {
    const item = forSupplier.find((i) => i.id === line.itemId);
    return sum + (item ? item.unitCost * (Number(line.qty) || 0) : 0);
  }, 0);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    const filled = lines.filter((line) => line.itemId && Number(line.qty) > 0);
    if (!supplierId) {
      setError("Choose a supplier for the order.");
      return;
    }
    if (!filled.length) {
      setError("Add at least one item with a quantity.");
      return;
    }
    if (new Set(filled.map((line) => line.itemId)).size !== filled.length) {
      setError("The same item appears twice — combine the quantities into one line.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const [created] = await api.purchaseOrders.create({
        supplierId,
        expectedDate: expectedDate || undefined,
        lines: filled.map((line) => ({ itemId: line.itemId, expectedQty: Number(line.qty) })),
      });
      toast.success(`${created.number} drafted for ${created.supplierName}.`);
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create the purchase order.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setError(null);
          setSupplierId("");
          setExpectedDate("");
          setLines([{ itemId: "", qty: "" }]);
        }
      }}
    >
      <Button onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        New Purchase Order
      </Button>

      <DialogContent className="max-w-[620px]">
        <DialogHeader>
          <DialogTitle>New purchase order</DialogTitle>
          <DialogDescription>
            Saved as a draft. Receiving happens later, from the purchase order list.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="po-supplier" className="text-xs opacity-70">
                Supplier
              </Label>
              <Select
                value={supplierId}
                onValueChange={(v) => {
                  setSupplierId(v ?? "");
                  // The old lines pointed at another supplier's catalogue.
                  setLines([{ itemId: "", qty: "" }]);
                }}
              >
                <SelectTrigger id="po-supplier" className="w-full bg-secondary">
                  <SelectValue>
                    {(v: string) =>
                      suppliers?.find((s) => s.id === v)?.name ?? "Choose a supplier"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(suppliers ?? []).map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="po-expected" className="text-xs opacity-70">
                Expected date
              </Label>
              {/* Native date input: no picker dependency, and it localises itself. */}
              <Input
                id="po-expected"
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="bg-secondary"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs opacity-70">Items</Label>
            {supplierId ? (
              <>
                {lines.map((line, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Select
                      value={line.itemId}
                      onValueChange={(v) => updateLine(index, { itemId: v ?? "" })}
                    >
                      <SelectTrigger
                        aria-label={`Item for line ${index + 1}`}
                        className="min-w-0 flex-1 bg-secondary"
                      >
                        <SelectValue>
                          {(v: string) =>
                            forSupplier.find((i) => i.id === v)?.name ?? "Choose an item"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      {/* A supplier's catalogue runs to dozens of SKUs. The
                          shared default centres the popup on the selected item,
                          which for a list this long runs off the bottom of the
                          screen — so anchor it under the trigger and let it
                          scroll instead. */}
                      <SelectContent alignItemWithTrigger={false} className="max-h-[280px]">
                        {forSupplier.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} — {item.sku}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min={1}
                      inputMode="numeric"
                      aria-label={`Quantity for line ${index + 1}`}
                      value={line.qty}
                      onChange={(e) => updateLine(index, { qty: e.target.value })}
                      placeholder="Qty"
                      className="w-[90px] bg-secondary"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-label={`Remove line ${index + 1}`}
                      disabled={lines.length === 1}
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLines((prev) => [...prev, { itemId: "", qty: "" }])}
                  >
                    <Plus className="size-4" />
                    Add line
                  </Button>
                  <span className="text-[13px] opacity-70">
                    Estimated total {fmtMoney(total)}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-[13px] opacity-60">
                Choose a supplier first — an order can only contain that supplier&apos;s items.
              </p>
            )}
          </div>

          {error ? (
            <p role="alert" className="border border-danger px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Create draft
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
