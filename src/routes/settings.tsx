import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/person-avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useHub } from "@/lib/store";
import { useMeQuery } from "@/lib/api-hooks";
import type { Person } from "@/lib/types";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user: authUser } = useCurrentUserState();
  const { data: meData } = useMeQuery();
  const dark = useHub((s) => s.dark);
  const toggleDark = useHub((s) => s.toggleDark);
  const collapsed = useHub((s) => s.sidebarCollapsed);
  const toggleSidebar = useHub((s) => s.toggleSidebar);

  const user: Person = meData?.profile
    ? {
        id: meData.profile.id,
        name: meData.profile.name,
        short: meData.profile.short || meData.profile.name.slice(0, 2).toUpperCase(),
        role: meData.profile.role as any,
        title: meData.profile.title,
        dept: meData.profile.dept,
        email: meData.profile.email,
        presence: (meData.profile.presence as any) || "active",
        avatar_url: meData.profile.avatar_url ?? undefined,
        projectIds: [],
        hoursThisWeek: 0,
        taskLoad: 0,
        streak: 0,
        attendance: 100,
      }
    : {
        id: authUser?.id ?? "me",
        name: authUser?.displayName ?? "Member",
        short: (authUser?.displayName || "MB").slice(0, 2).toUpperCase(),
        role: "member",
        title: "Team Member",
        dept: "Engineering",
        email: authUser?.primaryEmail ?? "",
        presence: "active",
        projectIds: [],
        hoursThisWeek: 0,
        taskLoad: 0,
        streak: 0,
        attendance: 100,
      };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted">Workspace preferences for your account and session.</p>
      </div>
      <Card className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <PersonAvatar person={user} size="lg" showPresence />
          <div>
            <div className="font-display text-lg font-semibold">{user.name}</div>
            <div className="text-sm text-muted">{user.title} • {user.dept}</div>
            <div className="font-mono text-xs text-subtle">{user.email}</div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => useHub.getState().setProfileDialog(true, meData?.profile?.user_id)}
        >
          Edit Profile
        </Button>
      </Card>
      <Card className="space-y-4 p-4">
        <h2 className="font-display text-sm font-semibold">Appearance</h2>
        <Row label="Dark mode" hint="Naval surfaces for late lab hours">
          <Switch checked={dark} onCheckedChange={() => toggleDark()} />
        </Row>
        <Row label="Compact sidebar" hint="Icon rail on large screens">
          <Switch checked={collapsed} onCheckedChange={() => toggleSidebar()} />
        </Row>
      </Card>
      <Card className="p-4">
        <h2 className="font-display text-sm font-semibold">Notifications</h2>
        <p className="mt-1 text-sm text-muted">Standup reminders, review SLAs, and blocker pages fire in-app.</p>
        <Button className="mt-3" variant="secondary" onClick={() => toast.success("Preferences saved")}>
          Save preferences
        </Button>
      </Card>
    </div>
  );
}

function Row({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <Label>{label}</Label>
        <p className="text-xs text-muted">{hint}</p>
      </div>
      {children}
    </div>
  );
}
