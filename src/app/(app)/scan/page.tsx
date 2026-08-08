"use client";

import { useState } from "react";
import { Loader2, Minus, Plus, ScanLine } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { Kicker, Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { InventoryItem } from "@/lib/types";

const STEPS = [
  "Align the barcode inside the frame",
  "Review the matched item and location",
  "Adjust the quantity and confirm",
];

export default function ScanPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [qty, setQty] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState<string | null>(null);

  async function lookup(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    setScanning(true);
    setNotFound(null);
    try {
      const found = await api.inventory.lookupByBarcode(code.trim());
      setItem(found);
      setQty(found.onHand);
    } catch (err) {
      setItem(null);
      setNotFound(err instanceof Error ? err.message : "Lookup failed.");
    } finally {
      setScanning(false);
    }
  }

  async function confirm() {
    if (!item) return;
    setSaving(true);
    try {
      await api.inventory.adjust(item.id, { newQty: qty, reason: "Counted on floor" });
      toast.success(`${item.name} set to ${qty} units.`);
      setItem(null);
      setCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the count.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader title="Scan to Receive" subtitle="Mobile · warehouse floor" />

      <div className="grid flex-1 items-start gap-10 px-6 py-8 lg:grid-cols-[1fr_auto] lg:px-9">
        <div className="max-w-lg">
          <Kicker>Mobile · Scan to Receive</Kicker>
          <h2 className="mt-2 text-[32px]">Point, scan, confirm</h2>
          <p className="mt-2 text-sm opacity-70">
            Floor staff scan a barcode to pull up the item instantly, then confirm or adjust the
            count without leaving the aisle.
          </p>

          <ol className="mt-7 flex flex-col gap-4">
            {STEPS.map((step, i) => (
              <li key={step} className="flex items-start gap-3">
                <span className="flex size-6 flex-none items-center justify-center border border-border font-heading text-[13px] font-semibold">
                  {i + 1}
                </span>
                <span className="text-sm">{step}</span>
              </li>
            ))}
          </ol>

          <form onSubmit={lookup} className="mt-8 flex gap-2">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Scan or type a barcode / SKU"
              aria-label="Barcode or SKU"
              className="bg-secondary"
            />
            <Button type="submit" disabled={scanning}>
              {scanning ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
              Look up
            </Button>
          </form>
          <p className="mt-2 text-[11px] opacity-55">
            Hardware scanners type into this field. Camera capture arrives with the mobile build.
          </p>
          {notFound ? (
            <p role="alert" className="mt-3 border border-danger px-3 py-2 text-[13px] text-danger">
              {notFound}
            </p>
          ) : null}
        </div>

        {/* Phone mock */}
        <Panel className="mx-auto w-[300px] p-3">
          <div className="flex flex-col bg-secondary">
            <div className="flex items-center justify-between px-4 py-2 text-[11px] opacity-70">
              <span>9:41</span>
              <span className="font-heading font-semibold">Stocklane</span>
              <span>▪▪▪</span>
            </div>

            {/* viewfinder */}
            <div className="relative mx-3 flex h-[190px] items-center justify-center bg-ink-900">
              <div className="relative h-[92px] w-[200px]">
                {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                  <span
                    key={pos}
                    className={`absolute size-5 border-brand-300 ${
                      pos === "tl"
                        ? "top-0 left-0 border-t-2 border-l-2"
                        : pos === "tr"
                          ? "top-0 right-0 border-t-2 border-r-2"
                          : pos === "bl"
                            ? "bottom-0 left-0 border-b-2 border-l-2"
                            : "right-0 bottom-0 border-r-2 border-b-2"
                    }`}
                  />
                ))}
                <div className="absolute inset-x-4 top-1/2 h-px bg-brand-300/80" />
              </div>
              <span className="absolute bottom-2 text-[11px] text-brand-200">
                {scanning ? "Scanning…" : item ? "Matched" : "Ready to scan"}
              </span>
            </div>

            <div className="p-4">
              <div className="text-[13px] font-medium">{item?.name ?? "No item scanned"}</div>
              <div className="text-[11px] opacity-60">
                {item ? `${item.sku} · ${item.bin ?? item.locationName}` : "Scan a barcode to begin"}
              </div>

              <div className="mt-4 flex items-center justify-between border border-border">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  disabled={!item}
                  onClick={() => setQty((q) => Math.max(0, q - 1))}
                  className="flex size-10 items-center justify-center border-r border-border disabled:opacity-40"
                >
                  <Minus className="size-4" />
                </button>
                <span className="stat-num">{item ? qty : "—"}</span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  disabled={!item}
                  onClick={() => setQty((q) => q + 1)}
                  className="flex size-10 items-center justify-center border-l border-border disabled:opacity-40"
                >
                  <Plus className="size-4" />
                </button>
              </div>

              <Button className="mt-3 w-full" disabled={!item || saving} onClick={confirm}>
                {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                Confirm Count
              </Button>
              <p className="mt-2 text-center text-[10px] opacity-50">
                Signed in as {user?.name ?? "—"}
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
