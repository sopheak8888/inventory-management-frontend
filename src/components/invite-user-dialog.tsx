"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
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
import type { UserRole } from "@/lib/types";

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "staff", label: "Staff" },
];

/** An admin has every location by definition, so the picker is theirs alone to skip. */
const ALL_LOCATIONS = "all";

export function InviteUserDialog({ onInvited }: { onInvited: () => void }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("staff");
  const [locationId, setLocationId] = useState(ALL_LOCATIONS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: locations } = useApi(() => api.reference.locations(), []);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const invited = await api.team.invite({
        email: email.trim(),
        role,
        locationId: locationId === ALL_LOCATIONS ? null : locationId,
      });
      toast.success(`Invitation created for ${invited.email}.`);
      setOpen(false);
      onInvited();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not send the invitation.");
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
          setEmail("");
          setRole("staff");
          setLocationId(ALL_LOCATIONS);
        }
      }}
    >
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="size-4" />
        Invite User
      </Button>

      <DialogContent className="max-w-[460px]">
        <DialogHeader>
          <DialogTitle>Invite a user</DialogTitle>
          <DialogDescription>
            They appear as invited and cannot sign in until they set a password.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-1.5">
            <Label htmlFor="invite-email" className="text-xs opacity-70">
              Email
            </Label>
            <Input
              id="invite-email"
              type="email"
              autoComplete="off"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@stocklane.co"
              className="bg-secondary"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="invite-role" className="text-xs opacity-70">
                Role
              </Label>
              <Select value={role} onValueChange={(v) => setRole((v as UserRole | null) ?? "staff")}>
                <SelectTrigger id="invite-role" className="w-full bg-secondary">
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
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="invite-location" className="text-xs opacity-70">
                Location
              </Label>
              <Select
                value={locationId}
                onValueChange={(v) => setLocationId(v ?? ALL_LOCATIONS)}
              >
                <SelectTrigger id="invite-location" className="w-full bg-secondary">
                  <SelectValue>
                    {(v: string) =>
                      v === ALL_LOCATIONS
                        ? "All locations"
                        : (locations?.find((l) => l.id === v)?.name ?? "…")
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_LOCATIONS}>All locations</SelectItem>
                  {(locations ?? []).map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      {location.name}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Send invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
