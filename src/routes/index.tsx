import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  Bell,
  Bolt,
  Download,
  FolderKanban,
  Megaphone,
  Send,
  ShieldAlert,
  Terminal,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/kpi-card";
import { PersonAvatar } from "@/components/person-avatar";
import { ProgressBar, progressTone } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { CYCLE, TODAY } from "@/lib/seed";
import { useHub } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  useMeQuery,
  useProjectsQuery,
  useTasksQuery,
  useReportsQuery,
  useTeamQuery,
  useDashboardAnalyticsQuery,
  usePingMemberMutation,
  usePingAllPendingMutation,
} from "@/lib/api-hooks";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import type { Person } from "@/lib/types";

export const Route = createFileRoute("/")({ component: CommandCenter });

function CommandCenter() {
  const navigate = useNavigate();
  const { user: authUser } = useCurrentUserState();
  const { data: meData } = useMeQuery();
  const { data: projects = [] } = useProjectsQuery();
  const { data: tasks = [] } = useTasksQuery();
  const { data: reports = [] } = useReportsQuery();
  const { data: team = [] } = useTeamQuery();
  const { data: analytics } = useDashboardAnalyticsQuery();
  const pingMember = usePingMemberMutation();
  const pingAllPending = usePingAllPendingMutation();

  const pinged = useHub((s) => s.pinged);
  const ping = useHub((s) => s.pingMember);

  const getPerson = (id: string): Person | undefined => {
    const fromTeam = team.find((u) => u.user_id === id);
    if (fromTeam) {
      return {
        id: fromTeam.user_id,
        name: fromTeam.name,
        short: fromTeam.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
        role: fromTeam.role,
        title: fromTeam.title,
        dept: fromTeam.dept,
        email: fromTeam.email,
        presence: fromTeam.presence,
        projectIds: fromTeam.projectIds,
        hoursThisWeek: 0,
        taskLoad: tasks.filter((t) => t.assigneeId === fromTeam.user_id && t.status !== "done").length,
        streak: 5,
        attendance: 100,
        year: fromTeam.year ?? undefined,
        reg: fromTeam.registration_no ?? undefined,
      };
    }
    return undefined;
  };

  const userName = meData?.profile?.name ?? authUser?.displayName ?? "Member";
  const overdue = tasks.filter((t) => t.status === "blocked" || (t.due && t.due < TODAY));
  const filedToday = reports.filter((r) => r.report_date === TODAY && r.status !== "draft");
  const filedUserIds = new Set(filedToday.map((r) => r.author_id));
  const pendingMembers = team.filter((u) => u.role === "member" && !filedUserIds.has(u.user_id));

  const workload = team
    .filter((u) => u.role === "lead" || u.role === "member")
    .map((u) => getPerson(u.user_id)!)
    .filter(Boolean)
    .sort((a, b) => b.taskLoad - a.taskLoad)
    .slice(0, 6);

  const recentActivities = analytics?.recentActivity ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-accent-ink">
              {CYCLE}
            </span>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              Live Database Connected
            </span>
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-[28px]">
            Good morning, {userName.split(" ")[0] === "Dr." ? userName : userName.split(" ")[0]}
          </h1>
          <p className="max-w-2xl text-sm text-muted">
            {team.length} members across {projects.length} strategic projects. {filedToday.length} daily reports registered today.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => toast.success("Briefing exported", { description: "Q3 W9 operations PDF queued." })}>
            <Download /> Export briefing
          </Button>
          <Button variant="secondary" size="sm" onClick={() => toast.success("Broadcast sent", { description: "Broadcasted to team notification channels." })}>
            <Megaphone /> Broadcast
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                <Bolt /> Quick action
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => useHub.getState().setTaskDialog(true)}>Assign task</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate({ to: "/reviews" })}>Review reports queue</DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  const ids = pendingMembers.map((u) => u.user_id);
                  if (ids.length > 0) {
                    try {
                      await pingAllPending.mutateAsync(ids);
                      toast.success("Batch reminders queued", {
                        description: `Sent notifications to ${ids.length} members pending reports.`,
                      });
                    } catch (err) {
                      toast.error("Failed to send reminders");
                    }
                  } else {
                    toast.info("All members have filed their reports today!");
                  }
                }}
              >
                Batch reminder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiCard
          label="Active projects"
          value={projects.length}
          hint={<span>82% pace · Full stack</span>}
          icon={<Terminal className="h-4 w-4" />}
          onClick={() => navigate({ to: "/projects" })}
        />
        <KpiCard
          label="Team members"
          value={team.length}
          hint={
            <span className="font-mono">
              <b className="text-ink">{team.filter((p) => p.presence === "active").length}</b> act ·{" "}
              {team.filter((p) => p.presence === "review").length} rev · {team.filter((p) => p.presence === "offline").length} off
            </span>
          }
          icon={<Users className="h-4 w-4" />}
          onClick={() => navigate({ to: "/team" })}
        />
        <KpiCard
          label="Today's reports"
          value={
            <span>
              {filedToday.length}
              <span className="text-lg font-medium text-muted"> / {team.filter((p) => p.role === "member").length || 18}</span>
            </span>
          }
          hint={
            <span className="flex justify-between">
              <span className="font-mono text-accent">Active tracking</span>
              <span className="text-danger">{pendingMembers.length} unfiled</span>
            </span>
          }
          icon={<FolderKanban className="h-4 w-4" />}
          onClick={() => navigate({ to: "/reviews" })}
        />
        <KpiCard
          label="Overdue / Blocked"
          value={overdue.length}
          tone={overdue.length > 0 ? "danger" : "default"}
          hint={<span className="font-mono">{tasks.filter((t) => t.status === "blocked").length} blockers logged</span>}
          icon={<AlertTriangle className="h-4 w-4" />}
          onClick={() => navigate({ to: "/tasks" })}
        />
        <KpiCard
          label="Active blockers"
          value={tasks.filter((t) => t.status === "blocked").length}
          tone="warn"
          hint={<span className="font-mono">Hardware & Credentials</span>}
          icon={<ShieldAlert className="h-4 w-4" />}
          onClick={() => navigate({ to: "/tasks" })}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Card className="overflow-hidden p-0 xl:col-span-7">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <h2 className="font-display text-sm font-semibold">Project health</h2>
              <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-muted">
                {projects.length} units
              </span>
            </div>
            <Link to="/projects" className="text-xs font-semibold text-accent">
              Full matrix
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="bg-surface-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                  <th className="px-4 py-2 font-medium">Project</th>
                  <th className="px-3 py-2 font-medium">Progress</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Lead</th>
                  <th className="px-4 py-2 text-right font-medium">Target</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const lead = getPerson(p.leadId);
                  return (
                    <tr
                      key={p.id}
                      className="cursor-pointer border-t border-border/70 hover:bg-surface-2/70 transition-colors"
                      onClick={() => navigate({ to: "/projects/$projectId", params: { projectId: p.id } })}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold">{p.name}</div>
                        <div className="font-mono text-[11px] text-muted">{p.subtitle}</div>
                      </td>
                      <td className="w-32 px-3 py-3">
                        <div className="mb-1 font-mono text-xs font-semibold tabular">{p.progress}%</div>
                        <ProgressBar value={p.progress} tone={progressTone(p.progress, p.status)} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge value={p.status} pulse={p.status === "at_risk"} />
                      </td>
                      <td className="px-3 py-3">
                        {lead ? (
                          <div className="flex items-center gap-2">
                            <PersonAvatar person={lead} size="sm" />
                            <div>
                              <div className="text-xs font-semibold">{lead.name}</div>
                              <div className="font-mono text-[10px] text-muted">{p.memberIds.length} members</div>
                            </div>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        <div className="font-semibold">{p.targetDate}</div>
                        <div className={cn("text-[10px] text-muted", p.status !== "healthy" && p.status !== "planning" && "text-danger")}>
                          {p.targetNote}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="flex flex-col p-4 xl:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold">Report compliance</h2>
            <span className="rounded-md bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
              {pendingMembers.length} missing
            </span>
          </div>
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-surface-2 p-3">
            <Gauge value={Math.round((filedToday.length / Math.max(1, team.filter((p) => p.role === "member").length)) * 100) || 78} />
            <div>
              <div className="font-display text-sm font-semibold">
                {filedToday.length} of {team.filter((p) => p.role === "member").length || 18} received
              </div>
              <p className="text-xs text-muted">Standup window closes 18:00 IST</p>
            </div>
          </div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {pendingMembers.slice(0, 6).map((u) => {
              const p = getPerson(u.user_id);
              if (!p) return null;
              const already = pinged.includes(p.id);
              return (
                <div key={p.id} className="flex items-center justify-between rounded-md px-1 py-1.5 hover:bg-surface-2">
                  <div className="flex items-center gap-2">
                    <PersonAvatar person={p} size="sm" />
                    <div>
                      <div className="text-sm font-semibold">{p.name}</div>
                      <div className={cn("font-mono text-[11px] text-muted", p.presence === "offline" && "text-danger")}>
                        {p.title} · {p.presence === "offline" ? "Inactive" : "Online"}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant={already ? "accent" : "secondary"}
                    disabled={pingMember.isPending}
                    onClick={async () => {
                      try {
                        await pingMember.mutateAsync(p.id);
                        ping(p.id);
                        toast.success(already ? "Nudged again" : "Reminder sent", { description: p.name });
                      } catch (err) {
                        toast.error("Failed to send reminder");
                      }
                    }}
                  >
                    {already ? <Bell /> : <Send />}
                    {already ? "Remind" : "Ping"}
                  </Button>
                </div>
              );
            })}
          </div>
          <Button
            className="mt-3"
            variant="secondary"
            disabled={pingAllPending.isPending || pendingMembers.length === 0}
            onClick={async () => {
              const ids = pendingMembers.map((u) => u.user_id);
              if (ids.length > 0) {
                try {
                  await pingAllPending.mutateAsync(ids);
                  toast.success(`Reminded all ${ids.length} unfiled members via in-app notification`);
                } catch (err) {
                  toast.error("Failed to send reminders");
                }
              } else {
                toast.info("All members have filed their reports today!");
              }
            }}
          >
            {pingAllPending.isPending ? "Sending notifications..." : "Remind all via Notification"}
          </Button>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-3">
            <h2 className="font-display text-sm font-semibold">Workload distribution</h2>
            <p className="text-xs text-muted">Live active task count per engineer</p>
          </div>
          <div className="space-y-3">
            {workload.map((p) => {
              const pct = Math.min(100, (p.taskLoad / 8) * 100);
              const tone = pct >= 100 ? "danger" : pct >= 80 ? "warn" : pct >= 50 ? "accent" : "success";
              return (
                <div key={p.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{p.name}</span>
                      <span
                        className={cn(
                          "rounded px-1.5 font-mono text-[10px]",
                          tone === "danger" && "bg-danger-soft text-danger",
                          tone === "warn" && "bg-warn-soft text-warn",
                          tone === "accent" && "bg-surface-2 text-ink",
                          tone === "success" && "bg-success-soft text-success",
                        )}
                      >
                        {p.taskLoad} tasks
                      </span>
                    </div>
                    <span className="font-mono text-[11px] text-muted">{Math.round(pct)}%</span>
                  </div>
                  <ProgressBar value={pct} tone={tone} className="h-2" />
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold">Critical path & blockers</h2>
            <span className="rounded-md bg-danger-soft px-2 py-0.5 text-[11px] font-semibold text-danger">
              {overdue.length} items
            </span>
          </div>
          <div className="space-y-2">
            {overdue.slice(0, 4).map((t) => {
              const assignee = getPerson(t.assigneeId);
              const project = projects.find((p) => p.id === t.projectId);
              return (
                <div key={t.id} className="rounded-lg bg-surface-2/80 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <StatusBadge value={t.priority} />
                        <span className="font-mono text-[11px] text-muted">{t.code}</span>
                      </div>
                      <div className="mt-1 text-sm font-semibold">{t.title}</div>
                    </div>
                    <span className="shrink-0 text-[11px] font-semibold text-danger">{t.dueLabel}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      {assignee ? <PersonAvatar person={assignee} size="xs" /> : null}
                      <span>{assignee?.name ?? "Assignee"}</span>
                      <span className="text-muted">· {project?.name}</span>
                    </div>
                    {t.blocker ? (
                      <span className="rounded bg-warn-soft px-1.5 py-0.5 font-mono text-[10px] text-warn">{t.blocker}</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {overdue.length === 0 ? (
              <p className="text-xs text-muted p-4 text-center">No critical path blockers active.</p>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="bg-navy p-5 text-navy-fg lg:col-span-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="rounded bg-navy-mid px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-gold">
              Priority notice
            </span>
            <Megaphone className="h-4 w-4 text-gold" />
          </div>
          <h3 className="font-display text-base font-semibold">Semester mid-term review</h3>
          <p className="mt-1 text-sm text-navy-muted">
            Faculty committee review upcoming. Leads must lock prototype staging builds and commit latest TRD specs.
          </p>
          <div className="mt-4 rounded-lg bg-navy-mid p-2.5 font-mono text-xs">Room 402 · Faculty Evaluation</div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-navy-muted">Target: All Project Leads</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success("Agenda dispatched to all leads")}
            >
              Dispatch agenda
            </Button>
          </div>
        </Card>

        <Card className="p-4 lg:col-span-8">
          <h2 className="mb-3 font-display text-sm font-semibold">Live operational stream</h2>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {recentActivities.map((a) => {
              const actor = getPerson(a.actorId);
              return (
                <div key={a.id} className="flex gap-3">
                  {actor ? <PersonAvatar person={actor} size="sm" /> : null}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="text-sm">
                        <span className="font-semibold">{actor?.name ?? "System"}</span> {a.text}
                      </p>
                      <span className="shrink-0 font-mono text-[10px] text-subtle">{a.at}</span>
                    </div>
                    {a.detail ? <p className="text-xs text-muted">{a.detail}</p> : null}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Gauge({ value }: { value: number }) {
  const r = 15.9155;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;
  return (
    <div className="relative h-16 w-16 shrink-0">
      <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
        <circle cx="18" cy="18" r={r} fill="none" stroke="currentColor" strokeWidth="3.5" className="text-surface-3" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="text-accent"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold">{value}%</span>
    </div>
  );
}
