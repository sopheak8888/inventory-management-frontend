"use client";

import { useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
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
import { useApi } from "@/lib/use-api";
import type { InventoryItem } from "@/lib/types";

/**
 * One form for both "Add Item" and "Edit" — the fields are identical apart from
 * the SKU and opening stock, which only a new item can set. Splitting them into
 * two components would duplicate eleven inputs to vary two.
 *
 * On edit the SKU is shown disabled rather than hidden: it identifies the row
 * the user opened, and PATCH /items/{id} deliberately won't change it.
 */
export function ItemDialog({
  item,
  onSaved,
}: {
  /** Absent for a new item. */
  item?: InventoryItem;
  onSaved: (saved: InventoryItem) => void;
}) {
  const editing = item !== undefined;
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: categories } = useApi(() => api.reference.categories(), []);
  const { data: locations } = useApi(() => api.reference.locations(), []);
  const { data: suppliers } = useApi(() => api.reference.suppliers(), []);

  // Reset from the item on every open, so a cancelled edit doesn't leave its
  // half-typed values behind for the next one.
  const [form, setForm] = useState(() => fieldsOf(item));

  const set = (field: keyof typeof form) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const saved = editing
        ? await api.inventory.update(item.id, {
            name: form.name.trim(),
            categoryId: form.categoryId,
            locationId: form.locationId,
            supplierId: form.supplierId,
            reorderPoint: Number(form.reorderPoint),
            reorderQty: Number(form.reorderQty),
            unitCost: Number(form.unitCost),
            sellPrice: Number(form.sellPrice),
            barcode: form.barcode.trim() || undefined,
          })
        : await api.inventory.create({
            sku: form.sku.trim(),
            name: form.name.trim(),
            categoryId: form.categoryId,
            locationId: form.locationId,
            supplierId: form.supplierId,
            onHand: Number(form.onHand),
            reorderPoint: Number(form.reorderPoint),
            reorderQty: Number(form.reorderQty),
            unitCost: Number(form.unitCost),
            sellPrice: Number(form.sellPrice),
            barcode: form.barcode.trim() || undefined,
          });

      toast.success(editing ? `${saved.name} saved.` : `${saved.name} added to the catalogue.`);
      setOpen(false);
      onSaved(saved);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the item. Try again.");
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
          setForm(fieldsOf(item));
        }
      }}
    >
      <Button
        variant={editing ? "outline" : "default"}
        onClick={() => setOpen(true)}
        disabled={editing && !item}
      >
        {editing ? <Pencil className="size-4" /> : <Plus className="size-4" />}
        {editing ? "Edit" : "Add Item"}
      </Button>

      <DialogContent className="max-w-[620px]">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${item.name}` : "Add an item"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Stock counts change through Adjust Stock, so they stay on the ledger."
              : "The opening count is written to the stock history as an adjustment."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU" htmlFor="sku">
              <Input
                id="sku"
                required
                disabled={editing}
                value={form.sku}
                onChange={(e) => set("sku")(e.target.value)}
                placeholder="SKU-10234"
                className="bg-secondary font-mono text-[13px]"
              />
            </Field>

            <Field label="Name" htmlFor="name">
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => set("name")(e.target.value)}
                placeholder="Organic Rolled Oats 25kg"
                className="bg-secondary"
              />
            </Field>

            <Field label="Category" htmlFor="category">
              <Picker
                id="category"
                value={form.categoryId}
                onChange={set("categoryId")}
                options={(categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
                placeholder="Choose a category"
              />
            </Field>

            <Field label="Location" htmlFor="location">
              <Picker
                id="location"
                value={form.locationId}
                onChange={set("locationId")}
                options={(locations ?? []).map((l) => ({ value: l.id, label: l.name }))}
                placeholder="Choose a location"
              />
            </Field>

            <Field label="Supplier" htmlFor="supplier">
              <Picker
                id="supplier"
                value={form.supplierId}
                onChange={set("supplierId")}
                options={(suppliers ?? []).map((s) => ({ value: s.id, label: s.name }))}
                placeholder="Choose a supplier"
              />
            </Field>

            {editing ? null : (
              <Field label="Opening count" htmlFor="onHand">
                <Input
                  id="onHand"
                  type="number"
                  min={0}
                  required
                  value={form.onHand}
                  onChange={(e) => set("onHand")(e.target.value)}
                  className="bg-secondary"
                />
              </Field>
            )}

            <Field label="Reorder point" htmlFor="reorderPoint">
              <Input
                id="reorderPoint"
                type="number"
                min={0}
                required
                value={form.reorderPoint}
                onChange={(e) => set("reorderPoint")(e.target.value)}
                className="bg-secondary"
              />
            </Field>

            <Field label="Reorder quantity" htmlFor="reorderQty">
              <Input
                id="reorderQty"
                type="number"
                min={1}
                required
                value={form.reorderQty}
                onChange={(e) => set("reorderQty")(e.target.value)}
                className="bg-secondary"
              />
            </Field>

            <Field label="Unit cost" htmlFor="unitCost">
              <Input
                id="unitCost"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.unitCost}
                onChange={(e) => set("unitCost")(e.target.value)}
                className="bg-secondary"
              />
            </Field>

            <Field label="Sell price" htmlFor="sellPrice">
              <Input
                id="sellPrice"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.sellPrice}
                onChange={(e) => set("sellPrice")(e.target.value)}
                className="bg-secondary"
              />
            </Field>

            <Field label="Barcode" htmlFor="barcode" className="sm:col-span-2">
              <Input
                id="barcode"
                value={form.barcode}
                onChange={(e) => set("barcode")(e.target.value)}
                placeholder="Optional — scanners match on digits"
                className="bg-secondary font-mono text-[13px]"
              />
            </Field>
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
              {editing ? "Save changes" : "Add item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Numbers held as strings so a cleared input stays empty instead of showing 0. */
function fieldsOf(item?: InventoryItem) {
  return {
    sku: item?.sku ?? "",
    name: item?.name ?? "",
    categoryId: item?.categoryId ?? "",
    locationId: item?.locationId ?? "",
    supplierId: item?.supplierId ?? "",
    onHand: String(item?.onHand ?? 0),
    reorderPoint: item?.reorderPoint === undefined ? "" : String(item.reorderPoint),
    reorderQty: item?.reorderQty === undefined ? "" : String(item.reorderQty),
    unitCost: item?.unitCost === undefined ? "" : String(item.unitCost),
    sellPrice: item?.sellPrice === undefined ? "" : String(item.sellPrice),
    barcode: item?.barcode ?? "",
  };
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={htmlFor} className="text-xs opacity-70">
        {label}
      </Label>
      {children}
    </div>
  );
}

/** Base UI renders the raw value unless given a label resolver — hence the child fn. */
function Picker({
  id,
  value,
  onChange,
  options,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger id={id} className="w-full bg-secondary">
        <SelectValue>
          {(v: string) => options.find((o) => o.value === v)?.label ?? placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
