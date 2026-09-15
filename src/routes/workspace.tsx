import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Check, Flag, GitBranch, Library, MessageSquare, Terminal, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/person-avatar";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { TODAY } from "@/lib/seed";
import { useHub } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  useMeQuery,
  useTasksQuery,
  useReportsQuery,
  useProjectsQuery,
  useTeamQuery,
  useUpdateTaskStatusMutation,
  useToggleSubtaskMutation,
} from "@/lib/api-hooks";
import type { Person } from "@/lib/types";

export const Route = createFileRoute("/workspace")({ component: Workspace });

function Workspace() {
  const { data: meData, isLoading: isMeLoading } = useMeQuery();
  const currentUserId = meData?.profile?.user_id || "";
  const { data: team = [] } = useTeamQuery();
  const { data: projects = [] } = useProjectsQuery();

  const getPerson = (id: string): Person | undefined => {
    const fromTeam = team.find((u) => u.user_id === id);
    if (fromTeam) {
      return {
        id: fromTeam.user_id,
        name: fromTeam.name,
        short: fromTeam.short || fromTeam.name.slice(0, 2).toUpperCase(),
        role: fromTeam.role,
        title: fromTeam.title,
        dept: fromTeam.dept,
        email: fromTeam.email,
        presence: fromTeam.presence,
        avatar_url: fromTeam.avatar_url,
        projectIds: fromTeam.projectIds,
        hoursThisWeek: 0,
        taskLoad: 0,
        streak: 5,
        attendance: 100,
        year: fromTeam.year ?? undefined,
        reg: fromTeam.registration_no ?? undefined,
      };
    }
    return undefined;
  };

  const { data: reports = [] } = useReportsQuery({
    authorId: currentUserId,
  });

  const hoursLoggedThisWeek = reports.reduce((sum, r) => sum + (Number(r.hours) || 0), 0);

  const member: Person = meData?.profile
    ? {
        id: meData.profile.user_id,
        name: meData.profile.name,
        short: meData.profile.short || meData.profile.name.slice(0, 2).toUpperCase(),
        role: meData.profile.role,
        title: meData.profile.title,
        dept: meData.profile.dept,
        email: meData.profile.email,
        presence: meData.profile.presence,
        avatar_url: meData.profile.avatar_url,
        phone: meData.profile.phone,
        bio: meData.profile.bio,
        college: meData.profile.college,
        skills: meData.profile.skills,
        linkedin_url: meData.profile.linkedin_url,
        github_url: meData.profile.github_url,
        portfolio_url: meData.profile.portfolio_url,
        location: meData.profile.location,
        projectIds: [],
        hoursThisWeek: hoursLoggedThisWeek,
        taskLoad: 0,
        streak: 5,
        attendance: 100,
        year: meData.profile.year ?? undefined,
        reg: meData.profile.registration_no ?? undefined,
      }
    : (getPerson(currentUserId) ?? {
        id: currentUserId,
        name: "Member",
        short: "MB",
        role: "member",
        title: "Team Member",
        dept: "RVIT",
        email: "",
        presence: "active",
        projectIds: [],
        hoursThisWeek: 0,
        taskLoad: 0,
        streak: 0,
        attendance: 100,
      });

  const targetAssigneeId = member.id;

  const { data: tasks = [], isLoading: isTasksLoading } = useTasksQuery({
    assigneeId: targetAssigneeId,
  });

  const updateStatus = useUpdateTaskStatusMutation();
  const toggleSubtask = useToggleSubtaskMutation();

  const todayReport = reports.find((r) => r.report_date === TODAY || r.report_date?.startsWith(TODAY));
  const isReportPending = !todayReport || todayReport.status === "draft";
  const setReportDialog = useHub((s) => s.setReportDialog);

  const weekDays = ["Mon 08", "Tue 09", "Wed 10", "Thu 11", "Fri 12", "Sat 13", "Sun 14"];
  const week = weekDays.map((d, i) => {
    const rep = reports[i];
    return { day: d, hours: rep ? Number(rep.hours) : (i < 5 ? 4.5 : 0) };
  });
  const project = projects.find((p) => p.memberIds.includes(targetAssigneeId)) ?? projects[0];

  const handleToggleSubtask = async (taskId: string, subId: string, currentDone: boolean) => {
    try {
      await toggleSubtask.mutateAsync({
        taskId,
        subtaskId: subId,
        done: !currentDone,
      });
    } catch (err: unknown) {
      toast.error("Failed to toggle subtask", { description: (err as Error)?.message });
    }
  };

  const handleMarkDone = async (taskId: string) => {
    try {
      await updateStatus.mutateAsync({
        taskId,
        status: "done",
        progress: 100,
      });
      toast.success("Task marked complete");
    } catch (err: unknown) {
      toast.error("Failed to complete task", { description: (err as Error)?.message });
    }
  };

  const handleMarkBlocker = async (taskId: string) => {
    try {
      await updateStatus.mutateAsync({
        taskId,
        status: "blocked",
        blocker: "Awaiting dependencies or hardware approval",
      });
      toast.message("Blocker logged", { description: "Lead and faculty notified." });
    } catch (err: unknown) {
      toast.error("Failed to log blocker", { description: (err as Error)?.message });
    }
  };

  if (isMeLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted">Loading your workspace...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {isReportPending ? (
        <div className="flex flex-col gap-3 rounded-xl border border-danger-border bg-danger-soft p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-danger px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-white">
                Due today
              </span>
              <span className="font-mono text-[11px] text-danger">Work routine mandate</span>
            </div>
            <p className="mt-1 text-sm font-semibold">
              Today's daily work report is pending. Due strictly by 8:00 PM IST.
            </p>
          </div>
          <Button variant="danger" onClick={() => setReportDialog(true)}>
            Submit daily report
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-success-border bg-success-soft p-4 text-sm font-semibold text-success">
          <Check className="h-5 w-5" /> Daily report filed for {TODAY}.
        </div>
      )}

      <Card className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <PersonAvatar person={member} size="lg" showPresence />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight">Good morning, {member.name}</h1>
                <span className="rounded-full bg-accent-soft px-2 py-0.5 font-mono text-[11px] font-semibold text-accent-ink">
                  Sprint 3 candidate
                </span>
              </div>
              <p className="mt-0.5 text-sm text-muted">
                {member.title} · <span className="font-medium text-ink">{member.dept}</span>
                {member.reg ? ` · ${member.reg}` : ""}
              </p>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted">
                <span>{project?.name ?? "Engineering Operations"}</span>
                <span>Guides: Dr. Shaik & Sekhar K.</span>
              </div>
            </div>
          </div>
          <div className="rounded-lg bg-surface-2 p-3">
            <div className="text-[11px] uppercase tracking-wider text-subtle">Session</div>
            <div className="font-display text-sm font-semibold">Thursday, Sep 11, 2026</div>
            <div className="font-mono text-xs text-accent">UTC+05:30 · IST</div>
            <div className="mt-1 text-xs font-semibold">Attendance verified</div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="flex flex-col gap-3 xl:col-span-8">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold">Today's assigned tasks</h2>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-[11px] font-bold">
              {tasks.length} active
            </span>
          </div>

          {isTasksLoading ? (
            <div className="flex min-h-[180px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : tasks.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted">
              No tasks currently assigned to you. Check the board or request assignments from your lead.
            </Card>
          ) : (
            tasks.map((t) => {
              const assigner = getPerson(t.assignerId);
              const accent =
                t.priority === "high" ? "bg-danger" : t.priority === "medium" ? "bg-gold" : "bg-border-strong";
              return (
                <Card key={t.id} className="relative overflow-hidden p-4 pl-5">
                  <span className={cn("absolute bottom-0 left-0 top-0 w-1.5", accent)} />
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-1.5">
                        <StatusBadge value={t.priority} />
                        <span className="font-mono text-[11px] text-subtle">{t.code}</span>
                      </div>
                      <h3 className="font-display text-sm font-semibold">{t.title}</h3>
                    </div>
                    <div className="text-right font-mono text-xs text-muted">
                      <div className={cn("font-semibold", t.priority === "high" && "text-danger")}>{t.dueLabel}</div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[11px] text-muted">
                      <span>Execution</span>
                      <span className="font-mono font-bold text-accent">{t.progress}%</span>
                    </div>
                    <ProgressBar value={t.progress} />
                  </div>
                  {t.subtasks && t.subtasks.length > 0 ? (
                    <div className="mt-3 space-y-1.5 rounded-lg bg-surface-2 p-2.5">
                      {t.subtasks.map((st) => (
                        <label key={st.id} className="flex cursor-pointer items-center gap-2 text-sm">
                          <Checkbox
                            checked={st.done}
                            onCheckedChange={() => handleToggleSubtask(t.id, st.id, st.done)}
                            disabled={toggleSubtask.isPending}
                          />
                          <span className={cn(st.done && "text-muted line-through")}>{st.title}</span>
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {t.branch ? (
                    <div className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-muted">
                      <GitBranch className="h-3.5 w-3.5" /> {t.branch}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted">
                      {assigner ? <PersonAvatar person={assigner} size="xs" /> : null}
                      Assigned by {assigner?.name ?? "Lead"}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleMarkBlocker(t.id)}
                        disabled={updateStatus.isPending || t.status === "blocked"}
                      >
                        <Flag /> Blocker
                      </Button>
                      <Button
                        size="sm"
                        variant="accent"
                        onClick={() => handleMarkDone(t.id)}
                        disabled={updateStatus.isPending || t.status === "done"}
                      >
                        <Check /> Complete
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        <div className="flex flex-col gap-3 xl:col-span-4">
          <h2 className="font-display text-sm font-semibold">Command palette</h2>
          <button
            onClick={() => setReportDialog(true)}
            className="flex items-center justify-between rounded-xl bg-navy p-3 text-left text-navy-fg transition-colors hover:bg-navy-mid"
          >
            <span>
              <div className="text-sm font-bold">Submit daily report</div>
              <div className="font-mono text-[11px] text-navy-muted">EOD standup</div>
            </span>
            <ArrowUpRight className="h-4 w-4 text-navy-muted" />
          </button>
          <Link
            to="/projects/$projectId"
            params={{ projectId: project?.id ?? "team-portal" }}
            className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 hover:bg-surface-2"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-accent">
                <Terminal className="h-5 w-5" />
              </span>
              <span>
                <div className="text-sm font-bold">Project repository</div>
                <div className="font-mono text-[11px] text-muted">{project?.repo ?? "rvit-tech/team-portal"}</div>
              </span>
            </span>
          </Link>
          <Link to="/documents" className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 hover:bg-surface-2">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-gold">
                <Library className="h-5 w-5" />
              </span>
              <span>
                <div className="text-sm font-bold">PRD & TRD specs</div>
                <div className="font-mono text-[11px] text-muted">v2.1 architecture</div>
              </span>
            </span>
          </Link>
          <Link to="/chat" className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 hover:bg-surface-2">
            <span className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-surface-2 text-accent">
                <MessageSquare className="h-5 w-5" />
              </span>
              <span>
                <div className="text-sm font-bold">Team chat</div>
                <div className="font-mono text-[11px] text-muted">#team-portal · Live discussion</div>
              </span>
            </span>
          </Link>

          <Card className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-sm font-semibold">Weekly consistency</h3>
              <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] font-bold text-accent">Week 37</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <Mini label="Hours" value="19.5" hint="/25h" />
              <Mini label="Tasks" value={String(tasks.length)} hint="Active" />
              <Mini label="Streak" value={`${member.streak}d`} hint="Reporting" />
            </div>
            <div className="mt-3 flex h-20 items-end gap-2 rounded-lg bg-surface-2 p-2">
              {week.map((d) => (
                <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className={cn(
                      "w-full rounded-sm",
                      d.hours === 0 ? "h-2 bg-danger/40" : "bg-accent",
                    )}
                    style={{ height: `${Math.max(8, d.hours * 8)}px` }}
                  />
                  <span className="font-mono text-[9px] text-subtle">{d.day.split(" ")[0]}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 space-y-1">
              {week.map((d) => (
                <div key={d.day} className="flex items-center justify-between rounded-md px-1 py-1 text-xs">
                  <span className="font-medium">{d.day}</span>
                  <span className="font-mono text-muted">{d.hours ? `${d.hours}h` : "--"}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-2 text-center">
      <div className="text-[10px] uppercase tracking-wider text-subtle">{label}</div>
      <div className="font-display text-lg font-bold">{value}</div>
      <div className="font-mono text-[10px] text-muted">{hint}</div>
    </div>
  );
}
