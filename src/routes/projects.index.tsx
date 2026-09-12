import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Loader2 } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { ProgressBar, progressTone } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useProjectsQuery, useTeamQuery } from "@/lib/api-hooks";
import { useHub } from "@/lib/store";
import { PEOPLE } from "@/lib/seed";
import type { Person } from "@/lib/types";

export const Route = createFileRoute("/projects/")({ component: ProjectsPage });

function ProjectsPage() {
  const { data: projects = [], isLoading, isError, error, refetch } = useProjectsQuery();
  const { data: team = [] } = useTeamQuery();
  const setOpen = useHub((s) => s.setProjectDialog);

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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Projects</h1>
          <p className="text-sm text-muted">
            {isLoading ? "Loading capstone units..." : `${projects.length} active capstone units this cycle.`}
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 h-4 w-4" /> New project
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted">Loading projects from database...</p>
        </div>
      ) : isError ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-danger-soft p-6 text-center">
          <p className="text-sm font-semibold text-danger">Failed to load projects: {(error as Error)?.message || "Unknown error"}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">No projects registered yet.</p>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Create first project
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const lead = getPerson(p.leadId);
            const faculty = getPerson(p.facultyId);
            return (
              <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id }} className="block">
                <Card className="flex h-full flex-col p-4 transition-shadow hover:shadow-md">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="rounded bg-navy px-1.5 py-0.5 font-mono text-[10px] font-semibold text-navy-fg">
                      {p.code}
                    </span>
                    <StatusBadge value={p.status} />
                  </div>
                  <h2 className="font-display text-base font-semibold">{p.name}</h2>
                  <p className="mt-1 line-clamp-2 text-sm text-muted">{p.abstract}</p>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between font-mono text-[11px]">
                      <span className="text-muted">{p.cycle}</span>
                      <span className="font-semibold">{p.progress}%</span>
                    </div>
                    <ProgressBar value={p.progress} tone={progressTone(p.progress, p.status)} />
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {p.memberIds.slice(0, 5).map((id) => {
                        const m = getPerson(id);
                        return m ? <PersonAvatar key={id} person={m} size="sm" /> : null;
                      })}
                    </div>
                    <div className="text-right text-[11px] text-muted">
                      <div>Lead {lead?.name ?? "—"}</div>
                      <div>PM {faculty?.name ?? "—"}</div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
