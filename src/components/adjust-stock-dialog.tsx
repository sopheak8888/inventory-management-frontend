"use client";

import { useState } from "react";
import { Loader2, SlidersHorizontal } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError } from "@/lib/api";
import { fmtNumber, fmtSigned } from "@/lib/format";
import type { InventoryItem } from "@/lib/types";

/**
 * Sets an absolute count, matching POST /items/{id}/adjustments and the scan
 * screen's stepper — a warehouse worker has just counted a shelf, they know the
 * total, not the delta. The delta is shown back to them so a typo the size of a
 * pallet is obvious before they save.
 */
export function AdjustStockDialog({
  item,
  onAdjusted,
}: {
  item: InventoryItem;
  onAdjusted: (updated: InventoryItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [qty, setQty] = useState(String(item.onHand));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsed = Number(qty);
  const valid = qty.trim() !== "" && Number.isInteger(parsed) && parsed >= 0;
  const delta = valid ? parsed - item.onHand : 0;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid) {
      setError("Enter the counted quantity as a whole number.");
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const updated = await api.inventory.adjust(item.id, {
        newQty: parsed,
        reason: reason.trim() || undefined,
      });
      toast.success(`${item.name} set to ${fmtNumber(parsed)} units.`);
      setOpen(false);
      setReason("");
      onAdjusted(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the adjustment.");
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
          setQty(String(item.onHand));
        }
      }}
    >
      <Button onClick={() => setOpen(true)}>
        <SlidersHorizontal className="size-4" />
        Adjust Stock
      </Button>

      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>
            {item.name} · {fmtNumber(item.onHand)} on hand now
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="counted" className="text-xs opacity-70">
              Counted quantity
            </Label>
            <Input
              id="counted"
              type="number"
              min={0}
              inputMode="numeric"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="bg-secondary"
            />
            <p className="min-h-[18px] text-[13px] opacity-70">
              {valid && delta !== 0 ? (
                <>
                  Recorded as{" "}
                  <span className={delta > 0 ? "text-brand-700" : "text-danger"}>
                    {fmtSigned(delta)}
                  </span>{" "}
                  on the stock history.
                </>
              ) : valid ? (
                "Same as the current count — nothing will be recorded."
              ) : null}
            </p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="reason" className="text-xs opacity-70">
              Reason
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Cycle count, aisle 3"
              className="bg-secondary"
            />
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
              Save adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
