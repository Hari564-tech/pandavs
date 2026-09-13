import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Loader2, Github, Edit3, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/person-avatar";
import { ProgressBar, progressTone } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useProjectsQuery, useTeamQuery, useMeQuery, useDeleteProjectMutation } from "@/lib/api-hooks";
import { useHub } from "@/lib/store";
import { PEOPLE } from "@/lib/seed";
import type { Person } from "@/lib/types";

export const Route = createFileRoute("/projects/")({ component: ProjectsPage });

function ProjectsPage() {
  const { data: projects = [], isLoading, isError, error, refetch } = useProjectsQuery();
  const { data: team = [] } = useTeamQuery();
  const { data: meData } = useMeQuery();
  const deleteProjectMutation = useDeleteProjectMutation();
  const setOpen = useHub((s) => s.setProjectDialog);

  const [projectToDelete, setProjectToDelete] = useState<{ id: string; name: string; code: string } | null>(null);

  const canManage =
    meData?.profile?.role === "super_admin" ||
    meData?.profile?.role === "faculty" ||
    meData?.profile?.role === "lead";

  async function handleDeleteConfirm() {
    if (!projectToDelete) return;
    try {
      await deleteProjectMutation.mutateAsync({ projectId: projectToDelete.id });
      toast.success("Project deleted successfully", { description: `${projectToDelete.code} · ${projectToDelete.name}` });
      setProjectToDelete(null);
    } catch (err: unknown) {
      toast.error("Failed to delete project", {
        description: (err as Error)?.message || "Server error occurred",
      });
    }
  }

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
        {canManage && (
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New project
          </Button>
        )}
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
          {canManage && (
            <Button size="sm" onClick={() => setOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Create first project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => {
            const lead = getPerson(p.leadId);
            const faculty = getPerson(p.facultyId);
            return (
              <Link key={p.id} to="/projects/$projectId" params={{ projectId: p.id }} className="block">
                <Card className="flex h-full flex-col p-4 transition-shadow hover:shadow-md relative group">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-navy px-1.5 py-0.5 font-mono text-[10px] font-semibold text-navy-fg">
                        {p.code}
                      </span>
                      <StatusBadge value={p.status} />
                    </div>
                    {canManage && (
                      <div
                        className="flex items-center gap-1"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7 text-subtle hover:text-ink"
                          title="Edit project"
                          onClick={() => setOpen(true, p)}
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="h-7 w-7 text-danger hover:bg-danger/10"
                          title="Delete project"
                          onClick={() => setProjectToDelete({ id: p.id, name: p.name, code: p.code })}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
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

                  {/* GitHub Repo & Live Preview Row */}
                  <div className="mt-3 flex items-center justify-between gap-2 pt-1 border-t border-border/50">
                    {p.repo ? (
                      <a
                        href={p.repo.startsWith("http") ? p.repo : `https://github.com/${p.repo}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-mono font-medium text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors"
                      >
                        <Github className="h-3.5 w-3.5" />
                        GitHub
                      </a>
                    ) : (
                      <span className="text-[11px] text-subtle font-mono">No repo linked</span>
                    )}
                    {p.preview && (
                      <a
                        href={p.preview.startsWith("http") ? p.preview : `https://${p.preview}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-accent hover:underline inline-flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" /> Demo
                      </a>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(projectToDelete)} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-danger flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Project ({projectToDelete?.code})
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{projectToDelete?.name}</strong>?
              This action cannot be undone and will remove all associated tasks, milestones, and reports.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setProjectToDelete(null)}
              disabled={deleteProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteConfirm}
              disabled={deleteProjectMutation.isPending}
            >
              {deleteProjectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Permanently Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
