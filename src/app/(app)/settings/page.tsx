"use client";

import { UserPlus } from "lucide-react";
import { ErrorNote } from "@/components/error-note";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/panel";
import { AccountBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";

const ROLE_LABEL = { admin: "Admin", manager: "Manager", staff: "Staff" } as const;

export default function SettingsPage() {
  const { data: team, error } = useApi(() => api.team.list(), []);
  const { data: locations } = useApi(() => api.reference.locations(), []);

  return (
    <>
      <PageHeader
        title="Settings"
        actions={
          <Button>
            <UserPlus className="size-4" />
            Invite User
          </Button>
        }
      />

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
            <Panel className="p-5 text-[13px] opacity-60">
              Organisation name, currency and fiscal calendar live here — wired up once the
              settings endpoints land.
            </Panel>
          </TabsContent>

          <TabsContent value="users" className="mt-5">
            <Panel>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(team ?? []).map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>{member.name}</TableCell>
                        <TableCell className="text-muted-foreground">{member.email}</TableCell>
                        <TableCell>{ROLE_LABEL[member.role]}</TableCell>
                        <TableCell>{member.locationLabel}</TableCell>
                        <TableCell>
                          <AccountBadge status={member.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Panel>
          </TabsContent>

          <TabsContent value="locations" className="mt-5">
            <Panel>
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
            <Panel className="p-5 text-[13px] opacity-60">
              Reorder-alert thresholds and digest delivery — wired up once the settings endpoints
              land.
            </Panel>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
