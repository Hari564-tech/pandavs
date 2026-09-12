import { createFileRoute } from "@tanstack/react-router";
import { Plus, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/person-avatar";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHub } from "@/lib/store";
import type { TaskStatus, Person } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useTasksQuery, useProjectsQuery, useTeamQuery, useUpdateTaskStatusMutation } from "@/lib/api-hooks";
import { PEOPLE } from "@/lib/seed";

export const Route = createFileRoute("/tasks")({ component: TasksPage });

const columns: { id: TaskStatus; title: string }[] = [
  { id: "todo", title: "To do" },
  { id: "in_progress", title: "In progress" },
  { id: "blocked", title: "Blocked" },
  { id: "review", title: "Review" },
  { id: "done", title: "Done" },
];

export function TasksPage() {
  const [q, setQ] = useState("");
  const [project, setProject] = useState("all");
  const [view, setView] = useState<"board" | "list">("board");

  const { data: tasks = [], isLoading, isError, error, refetch } = useTasksQuery({
    projectId: project !== "all" ? project : undefined,
    search: q.trim() || undefined,
  });
  const { data: projects = [] } = useProjectsQuery();
  const { data: team = [] } = useTeamQuery();
  const updateStatus = useUpdateTaskStatusMutation();
  const setTaskDialog = useHub((s) => s.setTaskDialog);

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
        taskLoad: 0,
        streak: 0,
        attendance: 100,
        year: fromTeam.year ?? undefined,
        reg: fromTeam.registration_no ?? undefined,
      };
    }
    return PEOPLE.find((p) => p.id === id);
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await updateStatus.mutateAsync({
        taskId,
        status: newStatus,
        progress: newStatus === "done" ? 100 : undefined,
      });
      toast.success(`Task moved to ${newStatus.replace("_", " ")}`);
    } catch (err: unknown) {
      toast.error("Failed to update task status", {
        description: (err as Error)?.message || "Unauthorized or invalid state",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted">
            {isLoading ? "Loading tasks..." : `${tasks.length} items in the current view.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Search tasks"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-44"
          />
          <Select value={project} onValueChange={setProject}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="All projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant={view === "board" ? "default" : "secondary"} size="sm" onClick={() => setView("board")}>
            Board
          </Button>
          <Button variant={view === "list" ? "default" : "secondary"} size="sm" onClick={() => setView("list")}>
            List
          </Button>
          <Button size="sm" onClick={() => setTaskDialog(true)}>
            <Plus className="mr-1 h-4 w-4" /> New task
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted">Loading tasks from database...</p>
        </div>
      ) : isError ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-danger-soft p-6 text-center">
          <p className="text-sm font-semibold text-danger">Failed to load tasks: {(error as Error)?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">No tasks match your filters.</p>
          <Button size="sm" onClick={() => setTaskDialog(true)}>
            <Plus className="mr-1 h-4 w-4" /> Assign a new task
          </Button>
        </div>
      ) : view === "board" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          {columns.map((col) => {
            const items = tasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="rounded-xl bg-surface-2/70 p-2">
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted">{col.title}</span>
                  <span className="font-mono text-[11px] text-subtle">{items.length}</span>
                </div>
                <div className="space-y-2">
                  {items.map((t) => {
                    const who = getPerson(t.assigneeId);
                    return (
                      <Card key={t.id} className="p-3">
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className="font-mono text-[10px] text-subtle">{t.code}</span>
                          <StatusBadge value={t.priority} />
                        </div>
                        <div className="text-sm font-semibold leading-snug">{t.title}</div>
                        <ProgressBar value={t.progress} className="mt-2" />
                        <div className="mt-2 flex items-center justify-between">
                          {who ? <PersonAvatar person={who} size="xs" /> : <span />}
                          <select
                            className="rounded-md border border-border bg-surface px-1 py-0.5 text-[11px]"
                            value={t.status}
                            onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}
                            disabled={updateStatus.isPending}
                          >
                            {columns.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.title}
                              </option>
                            ))}
                          </select>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Task</th>
                <th className="px-3 py-2 text-left font-medium">Owner</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">Progress</th>
                <th className="px-4 py-2 text-right font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const who = getPerson(t.assigneeId);
                return (
                  <tr key={t.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-semibold">{t.title}</div>
                      <div className="font-mono text-[11px] text-muted">{t.code}</div>
                    </td>
                    <td className="px-3 py-3">{who ? <PersonAvatar person={who} size="sm" /> : null}</td>
                    <td className="px-3 py-3">
                      <select
                        className="rounded-md border border-border bg-surface px-2 py-1 text-xs"
                        value={t.status}
                        onChange={(e) => handleStatusChange(t.id, e.target.value as TaskStatus)}
                        disabled={updateStatus.isPending}
                      >
                        {columns.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="w-40 px-3 py-3">
                      <ProgressBar value={t.progress} />
                    </td>
                    <td className={cn("px-4 py-3 text-right font-mono text-xs", t.status === "blocked" && "text-danger")}>
                      {t.dueLabel}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
