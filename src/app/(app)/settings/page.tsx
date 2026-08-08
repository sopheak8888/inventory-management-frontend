"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AddLocationDialog } from "@/components/add-location-dialog";
import { ErrorNote } from "@/components/error-note";
import { InviteUserDialog, ROLE_OPTIONS } from "@/components/invite-user-dialog";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelTitle } from "@/components/panel";
import { AccountBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/use-api";
import type { DigestFrequency, OrgSettings, TeamMember, UserRole, UserStatus } from "@/lib/types";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const FREQUENCIES: { value: DigestFrequency; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "invited", label: "Invited" },
  { value: "disabled", label: "Disabled" },
];

const ALL_LOCATIONS = "all";

/**
 * Each form holds its own draft state, so it takes the saved values as initial
 * state and is remounted — via these keys — only when those values actually
 * change. Adopting them in an effect instead would either clobber what the user
 * is typing or need a guard on every field.
 */
const generalKey = (s: OrgSettings) =>
  `${s.organisationName}|${s.currency}|${s.fiscalYearStartMonth}`;
const digestKey = (s: OrgSettings) =>
  `${s.alertDigestEnabled}|${s.alertDigestEmail}|${s.alertDigestFrequency}`;

function Loading() {
  return <Panel className="p-5 text-[13px] opacity-60">Loading settings…</Panel>;
}

/**
 * Every tab here is admin-only on the server, so a manager or staff member who
 * reaches this route would meet nothing but 403s. The sidebar hides the link for
 * them; this page states the reason rather than rendering four failing panels,
 * because the URL is still typeable.
 */
export default function SettingsPage() {
  const { user } = useAuth();

  if (user && user.role !== "admin") {
    return (
      <>
        <PageHeader title="Settings" />
        <div className="px-6 py-6 lg:px-9">
          <Panel className="p-5 text-[13px]">
            Organisation settings, users and locations are managed by an admin. Ask one of them
            if something here needs changing.
          </Panel>
        </div>
      </>
    );
  }

  return <AdminSettings />;
}

function AdminSettings() {
  const { data: team, error, reload: reloadTeam } = useApi(() => api.team.list(), []);
  const { data: locations, reload: reloadLocations } = useApi(() => api.reference.locations(), []);
  const { data: settings, reload: reloadSettings } = useApi(() => api.settings.get(), []);

  return (
    <>
      <PageHeader title="Settings" actions={<InviteUserDialog onInvited={reloadTeam} />} />

      <div className="px-6 py-6 lg:px-9">
        {error ? <ErrorNote message={error.message} /> : null}

        <Tabs defaultValue="users">
          <TabsList className="bg-secondary">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="users">Users &amp; Roles</TabsTrigger>
            <TabsTrigger value="locations">Locations</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="mt-5">
            {settings ? (
              <GeneralTab
                key={generalKey(settings)}
                settings={settings}
                onSaved={reloadSettings}
              />
            ) : (
              <Loading />
            )}
          </TabsContent>

          <TabsContent value="users" className="mt-5">
            <Panel>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead className="w-[150px]">Role</TableHead>
                      <TableHead className="w-[180px]">Location</TableHead>
                      <TableHead className="w-[150px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(team ?? []).map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        locations={locations ?? []}
                        onChanged={reloadTeam}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="locations" className="mt-5">
            <Panel>
              <div className="flex items-center justify-between px-4 py-3">
                <PanelTitle className="text-[15px]">Locations</PanelTitle>
                {/* The member rows read the same list, so one refetch covers both. */}
                <AddLocationDialog onCreated={reloadLocations} />
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Location</TableHead>
                      <TableHead className="text-right">SKUs</TableHead>
                      <TableHead className="text-right">Utilisation</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(locations ?? []).map((loc) => (
                      <TableRow key={loc.id}>
                        <TableCell>{loc.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{loc.skuCount}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {Math.round(loc.utilisation * 100)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="notifications" className="mt-5">
            {settings ? (
              <NotificationsTab
                key={digestKey(settings)}
                settings={settings}
                onSaved={reloadSettings}
              />
            ) : (
              <Loading />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}

function GeneralTab({ settings, onSaved }: { settings: OrgSettings; onSaved: () => void }) {
  const [name, setName] = useState(settings.organisationName);
  const [currency, setCurrency] = useState(settings.currency);
  const [month, setMonth] = useState(String(settings.fiscalYearStartMonth));
  const { saving, error, save } = useSave(onSaved, "Organisation settings saved.");

  return (
    <Panel className="p-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(() =>
            api.settings.update({
              organisationName: name.trim(),
              currency: currency.trim(),
              fiscalYearStartMonth: Number(month),
            }),
          );
        }}
        className="flex max-w-[520px] flex-col gap-4"
        noValidate
      >
        <div className="grid gap-1.5">
          <Label htmlFor="org-name" className="text-xs opacity-70">
            Organisation name
          </Label>
          <Input
            id="org-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!settings}
            className="bg-secondary"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="org-currency" className="text-xs opacity-70">
              Currency
            </Label>
            <Input
              id="org-currency"
              required
              maxLength={3}
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
              disabled={!settings}
              className="bg-secondary font-mono text-[13px]"
            />
            <p className="text-[13px] opacity-60">Three-letter ISO code.</p>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="org-fiscal" className="text-xs opacity-70">
              Fiscal year starts
            </Label>
            <Select value={month} onValueChange={(v) => setMonth(v ?? "1")}>
              <SelectTrigger id="org-fiscal" className="w-full bg-secondary">
                <SelectValue>{(v: string) => MONTHS[Number(v) - 1] ?? "January"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((label, index) => (
                  <SelectItem key={label} value={String(index + 1)}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {error ? (
          <p role="alert" className="border border-danger px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !settings}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function NotificationsTab({ settings, onSaved }: { settings: OrgSettings; onSaved: () => void }) {
  const [enabled, setEnabled] = useState(settings.alertDigestEnabled);
  const [email, setEmail] = useState(settings.alertDigestEmail);
  const [frequency, setFrequency] = useState<DigestFrequency>(settings.alertDigestFrequency);
  const { saving, error, save } = useSave(onSaved, "Notification settings saved.");

  return (
    <Panel className="p-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save(() =>
            api.settings.update({
              alertDigestEnabled: enabled,
              alertDigestEmail: email.trim(),
              alertDigestFrequency: frequency,
            }),
          );
        }}
        className="flex max-w-[520px] flex-col gap-4"
        noValidate
      >
        <label className="flex cursor-pointer items-center gap-2 text-[13px]">
          <Checkbox
            checked={enabled}
            onCheckedChange={(next) => setEnabled(next === true)}
            disabled={!settings}
            className="border-border"
          />
          Send a reorder-alert digest
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="digest-email" className="text-xs opacity-70">
              Digest recipient
            </Label>
            <Input
              id="digest-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!settings}
              className="bg-secondary"
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="digest-frequency" className="text-xs opacity-70">
              Frequency
            </Label>
            <Select
              value={frequency}
              onValueChange={(v) => setFrequency((v as DigestFrequency | null) ?? "daily")}
            >
              <SelectTrigger id="digest-frequency" className="w-full bg-secondary">
                <SelectValue>
                  {(v: string) => FREQUENCIES.find((f) => f.value === v)?.label ?? v}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <p className="border-t border-border pt-4 text-[13px] opacity-60">
          An item is flagged <strong>critical</strong> at or below{" "}
          {settings?.criticalThresholdPct ?? 25}% of its reorder point, and{" "}
          <strong>low</strong> anywhere below the point. That threshold is a fixed rule rather
          than a setting: every item&apos;s status is stored against it.
        </p>

        {error ? (
          <p role="alert" className="border border-danger px-3 py-2 text-[13px] text-danger">
            {error}
          </p>
        ) : null}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !settings}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            Save changes
          </Button>
        </div>
      </form>
    </Panel>
  );
}

/**
 * Inline editing rather than an edit dialog: the table already shows the three
 * fields PATCH /users/{id} accepts, so making them controls is less UI than
 * duplicating the row into a form.
 */
function MemberRow({
  member,
  locations,
  onChanged,
}: {
  member: TeamMember;
  locations: { id: string; name: string }[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);

  // The API takes ids; the list gives a label. Matching by name is safe here
  // because location names are unique — POST /locations rejects a duplicate.
  const currentLocationId =
    locations.find((l) => l.name === member.locationLabel)?.id ?? ALL_LOCATIONS;

  async function patch(payload: Parameters<typeof api.team.update>[1], what: string) {
    setBusy(true);
    try {
      await api.team.update(member.id, payload);
      toast.success(`${member.name}: ${what}.`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : `Could not update ${member.name}.`);
      // Refetch so the control snaps back to what the server actually holds.
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <TableRow>
      <TableCell>{member.name}</TableCell>
      <TableCell className="text-muted-foreground">{member.email}</TableCell>
      <TableCell>
        <Select
          value={member.role}
          onValueChange={(v) => v && v !== member.role && patch({ role: v as UserRole }, `role set to ${v}`)}
        >
          <SelectTrigger aria-label={`Role for ${member.name}`} disabled={busy} className="w-full bg-secondary">
            <SelectValue>
              {(v: string) => ROLE_OPTIONS.find((r) => r.value === v)?.label ?? v}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {ROLE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={currentLocationId}
          onValueChange={(v) =>
            v &&
            v !== currentLocationId &&
            patch(
              { locationId: v === ALL_LOCATIONS ? "" : v },
              v === ALL_LOCATIONS
                ? "given every location"
                : `moved to ${locations.find((l) => l.id === v)?.name ?? v}`,
            )
          }
        >
          <SelectTrigger
            aria-label={`Location for ${member.name}`}
            disabled={busy}
            className="w-full bg-secondary"
          >
            <SelectValue>
              {(v: string) =>
                v === ALL_LOCATIONS
                  ? "All locations"
                  : (locations.find((l) => l.id === v)?.name ?? "…")
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_LOCATIONS}>All locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location.id} value={location.id}>
                {location.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell>
        <Select
          value={member.status}
          onValueChange={(v) =>
            v && v !== member.status && patch({ status: v as UserStatus }, `marked ${v}`)
          }
        >
          <SelectTrigger
            aria-label={`Status for ${member.name}`}
            disabled={busy}
            className="w-full bg-transparent"
          >
            <SelectValue>{() => <AccountBadge status={member.status} />}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
    </TableRow>
  );
}

/** The saving/error/toast trio both settings forms need, in one place. */
function useSave(onSaved: () => void, success: string) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(run: () => Promise<unknown>) {
    setError(null);
    setSaving(true);
    try {
      await run();
      toast.success(success);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return { saving, error, save };
}
