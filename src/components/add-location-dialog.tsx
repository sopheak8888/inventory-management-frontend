"use client";

import { useState } from "react";
import { Loader2, Plus } from "lucide-react";
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
import { api, ApiError } from "@/lib/api";

export function AddLocationDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState("500");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const created = await api.reference.createLocation({
        name: name.trim(),
        capacity: Number(capacity),
      });
      toast.success(`${created.name} added with an empty bin map.`);
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not add the location.");
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
          setName("");
          setCapacity("500");
        }
      }}
    >
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" />
        Add location
      </Button>

      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Add a location</DialogTitle>
          <DialogDescription>
            It arrives with the standard 4-aisle bin grid, ready for the warehouse map.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="loc-name" className="text-xs opacity-70">
              Name
            </Label>
            <Input
              id="loc-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Warehouse C"
              className="bg-secondary"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="loc-capacity" className="text-xs opacity-70">
              SKU capacity
            </Label>
            <Input
              id="loc-capacity"
              type="number"
              min={1}
              required
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="bg-secondary"
            />
            <p className="text-[13px] opacity-60">
              The denominator of the utilisation bars — how many SKUs this site can hold.
            </p>
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
              Add location
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
