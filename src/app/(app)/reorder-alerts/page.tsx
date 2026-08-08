"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ErrorNote } from "@/components/error-note";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { fmtNumber } from "@/lib/format";
import { useApi } from "@/lib/use-api";
import type { AlertSeverity, ReorderAlert } from "@/lib/types";

const GROUPS: { severity: AlertSeverity; heading: string }[] = [
  { severity: "critical", heading: "Critical — below minimum" },
  { severity: "low", heading: "Low — approaching reorder point" },
];

export default function ReorderAlertsPage() {
  const { user } = useAuth();
  // A staff member at one site should not be asked to reorder another's stock.
  const { data: alerts, error, reload } = useApi(
    () => api.reorderAlerts.list(user?.locationId ?? undefined),
    [user?.locationId],
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createPurchaseOrders() {
    const ids = selected.size ? [...selected] : (alerts ?? []).map((a) => a.id);
    if (!ids.length) return;
    setSubmitting(true);
    try {
      const created = await api.purchaseOrders.createFromAlerts(ids);
      toast.success(
        `${created.length} purchase order${created.length === 1 ? "" : "s"} drafted from ${ids.length} alert${ids.length === 1 ? "" : "s"}.`,
      );
      setSelected(new Set());
      // An alert *is* an item below its reorder point, so drafting an order does
      // not clear it — but stock can have moved since the page loaded, and the
      // count in the subtitle has to match what is on screen.
      reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create purchase orders.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Reorder Alerts"
        subtitle={alerts ? `${alerts.length} items need attention` : undefined}
        actions={
          <Button onClick={createPurchaseOrders} disabled={submitting || !alerts?.length}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Create Purchase Orders
            {selected.size ? ` (${selected.size})` : ""}
          </Button>
        }
      />

      <div className="flex flex-col gap-7 px-6 py-7 lg:px-9">
        {error ? <ErrorNote message={error.message} /> : null}

        {GROUPS.map(({ severity, heading }) => {
          const group = (alerts ?? []).filter((a) => a.severity === severity);
          if (!group.length) return null;
          return (
            <section key={severity}>
              <h2
                className={`mb-3 text-[13px] tracking-[0.08em] uppercase ${
                  severity === "critical" ? "text-danger" : "text-primary"
                }`}
              >
                {heading}
              </h2>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {group.map((alert) => (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    selected={selected.has(alert.id)}
                    onToggle={() => toggle(alert.id)}
                  />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function AlertCard({
  alert,
  selected,
  onToggle,
}: {
  alert: ReorderAlert;
  selected: boolean;
  onToggle: () => void;
}) {
  const pct = Math.min(100, Math.round((alert.onHand / alert.minimum) * 100));

  return (
    <Panel className="flex flex-col gap-3 p-4">
      <div>
        <div className="font-heading text-[16px] font-semibold">{alert.itemName}</div>
        <div className="mt-0.5 text-xs opacity-60">
          {alert.locationName} · {alert.supplierName}
        </div>
      </div>

      <div>
        <div className="text-[13px]">
          <span className={alert.severity === "critical" ? "text-danger" : ""}>
            {fmtNumber(alert.onHand)} on hand
          </span>{" "}
          <span className="opacity-60">/ {fmtNumber(alert.minimum)} minimum</span>
        </div>
        <div className="mt-1.5 h-1 bg-ink-200">
          <div
            className={`h-full ${alert.severity === "critical" ? "bg-danger" : "bg-primary"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <Button
        variant={selected ? "default" : "outline"}
        size="sm"
        onClick={onToggle}
        aria-pressed={selected}
        className="mt-auto"
      >
        {selected ? "Added" : "Add to PO"} — {fmtNumber(alert.suggestedQty)} units
      </Button>
    </Panel>
  );
}
