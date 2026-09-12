import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { StatusBadge } from "@/components/status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useTeamQuery, useProjectsQuery, useTasksQuery } from "@/lib/api-hooks";
import { useHub } from "@/lib/store";
import type { Person, Role } from "@/lib/types";

export const Route = createFileRoute("/team")({ component: TeamPage });

export function TeamPage() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");
  const setProfileDialog = useHub((s) => s.setProfileDialog);

  const { data: team = [], isLoading, isError, error, refetch } = useTeamQuery();
  const { data: projects = [] } = useProjectsQuery();
  const { data: tasks = [] } = useTasksQuery();

  const people: Person[] = useMemo(() => {
    return team.map((u) => ({
      id: u.user_id,
      name: u.name,
      short: u.short || u.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
      role: u.role,
      title: u.title,
      dept: u.dept,
      email: u.email,
      presence: u.presence,
      avatar_url: u.avatar_url,
      phone: u.phone,
      bio: u.bio,
      college: u.college,
      skills: u.skills,
      linkedin_url: u.linkedin_url,
      github_url: u.github_url,
      portfolio_url: u.portfolio_url,
      location: u.location,
      projectIds: u.projectIds,
      hoursThisWeek: 0,
      taskLoad: tasks.filter((t) => t.assigneeId === u.user_id && t.status !== "done").length,
      streak: 5,
      attendance: 100,
      year: u.year ?? undefined,
      reg: u.registration_no ?? undefined,
    }));
  }, [team, tasks]);

  const filtered = useMemo(
    () =>
      people.filter((p) => {
        if (role !== "all" && p.role !== role) return false;
        if (q && !`${p.name} ${p.title} ${p.dept} ${p.email}`.toLowerCase().includes(q.toLowerCase())) return false;
        return true;
      }),
    [people, q, role],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Team directory</h1>
          <p className="text-sm text-muted">
            {isLoading ? "Loading directory..." : `${filtered.length} people in the engineering cohort.`}
          </p>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Search people"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-48"
          />
          <select
            className="h-9 rounded-md border border-border bg-surface px-2 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="all">All roles</option>
            <option value="super_admin">Admin</option>
            <option value="faculty">Faculty</option>
            <option value="lead">Leads</option>
            <option value="member">Members</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted">Loading team profiles...</p>
        </div>
      ) : isError ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-danger-soft p-6 text-center">
          <p className="text-sm font-semibold text-danger">Failed to load directory: {(error as Error)?.message}</p>
          <button className="text-xs font-semibold text-accent underline" onClick={() => refetch()}>
            Retry
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <Card
              key={p.id}
              onClick={() => setProfileDialog(true, p.id)}
              className="flex items-start gap-3 p-4 cursor-pointer hover:border-accent/60 transition-all hover:shadow-sm group"
            >
              <PersonAvatar person={p} showPresence />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold group-hover:text-accent transition-colors">{p.name}</div>
                    <div className="text-xs text-muted">{p.title}</div>
                  </div>
                  <StatusBadge value={p.role} />
                </div>
                <div className="mt-2 font-mono text-[11px] text-muted">{p.email}</div>
                <div className="mt-1 text-xs text-muted">
                  {p.dept} · {p.taskLoad} open tasks · streak {p.streak}d
                </div>
                {p.projectIds.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {p.projectIds.map((id) => {
                      const proj = projects.find((x) => x.id === id);
                      return proj ? (
                        <span key={id} className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-mono font-semibold">
                          {proj.code}
                        </span>
                      ) : null;
                    })}
                  </div>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
