import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ExternalLink, FileText, Plus, Terminal, Loader2, Github, Trash2, Edit3, UserPlus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PersonAvatar } from "@/components/person-avatar";
import { ProgressBar, progressTone } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DOCUMENTS, MILESTONES, PEOPLE } from "@/lib/seed";
import { useHub } from "@/lib/store";
import { cn } from "@/lib/utils";
import {
  useProjectDetailQuery,
  useTasksQuery,
  useDocumentsQuery,
  useTeamQuery,
  useMeQuery,
  useDeleteProjectMutation,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,
  useDeleteDocumentMutation,
} from "@/lib/api-hooks";
import { getDocumentDownloadUrlFn } from "@/server/fns";
import type { Person } from "@/lib/types";

export const Route = createFileRoute("/projects/$projectId")({ component: ProjectDetail });

function ProjectDetail() {
  const { projectId } = Route.useParams();
  const navigate = useNavigate();
  const { data: project, isLoading, isError, error } = useProjectDetailQuery(projectId);
  const { data: tasks = [] } = useTasksQuery({ projectId });
  const { data: serverDocs = [] } = useDocumentsQuery(projectId);
  const { data: team = [] } = useTeamQuery();
  const { data: meData } = useMeQuery();
  const deleteProjectMutation = useDeleteProjectMutation();
  const addMemberMutation = useAddProjectMemberMutation();
  const removeMemberMutation = useRemoveProjectMemberMutation();
  const deleteDocMutation = useDeleteDocumentMutation();
  const setProjectDialog = useHub((s) => s.setProjectDialog);

  const [tab, setTab] = useState("overview");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRole, setSelectedRole] = useState<"member" | "lead">("member");
  const [docToDelete, setDocToDelete] = useState<{ id: string; name: string } | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const setTask = useHub((s) => s.setTaskDialog);

  const isSuperAdminOrFaculty =
    meData?.profile?.role === "super_admin" || meData?.profile?.role === "faculty";
  const isProjectLead =
    project?.leadId === meData?.profile?.user_id ||
    (meData?.profile?.role === "lead" && (!project?.leadId || project?.leadId === meData?.profile?.user_id));

  const canManage = isSuperAdminOrFaculty || meData?.profile?.role === "lead";
  const canManageMembers = isSuperAdminOrFaculty || (meData?.profile?.role === "lead" && isProjectLead);
  const canDeleteDocs = isSuperAdminOrFaculty || meData?.profile?.role === "lead";

  async function handleDeleteProject() {
    if (!project) return;
    try {
      await deleteProjectMutation.mutateAsync({ projectId: project.id });
      toast.success("Project deleted successfully", { description: `${project.code} · ${project.name}` });
      setDeleteConfirmOpen(false);
      navigate({ to: "/projects" });
    } catch (err: unknown) {
      toast.error("Failed to delete project", {
        description: (err as Error)?.message || "Server error occurred",
      });
    }
  }

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!project || !selectedUserId) {
      toast.error("Please select a team member to add");
      return;
    }
    try {
      await addMemberMutation.mutateAsync({
        projectId: project.id,
        userId: selectedUserId,
        role: selectedRole,
      });
      toast.success("Team member added to project");
      setSelectedUserId("");
      setSelectedRole("member");
      setAddMemberOpen(false);
    } catch (err: unknown) {
      toast.error("Failed to add member", {
        description: (err as Error)?.message || "Server error occurred",
      });
    }
  }

  async function handleRemoveMemberConfirm() {
    if (!project || !memberToRemove) return;
    try {
      await removeMemberMutation.mutateAsync({
        projectId: project.id,
        userId: memberToRemove.id,
      });
      toast.success("Member removed from project", { description: memberToRemove.name });
      setMemberToRemove(null);
    } catch (err: unknown) {
      toast.error("Failed to remove member", {
        description: (err as Error)?.message || "Server error occurred",
      });
    }
  }

  async function handleDownloadDoc(docId: string, name: string) {
    try {
      const downloadUrl = await getDocumentDownloadUrlFn({ data: docId });
      if (downloadUrl) {
        window.open(downloadUrl, "_blank");
        toast.success(`Accessing signed document: ${name}`);
      } else {
        toast.info(`Document ${name} verified`);
      }
    } catch (err: unknown) {
      toast.error("Failed to generate download URL", {
        description: (err as Error)?.message || "Unauthorized access",
      });
    }
  }

  async function handleDeleteDocConfirm() {
    if (!docToDelete) return;
    try {
      await deleteDocMutation.mutateAsync({ documentId: docToDelete.id });
      toast.success("Document deleted", { description: docToDelete.name });
      setDocToDelete(null);
    } catch (err: unknown) {
      toast.error("Failed to delete document", {
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

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
        <p className="text-sm text-muted">Loading project details...</p>
      </div>
    );
  }

  if (isError || !project) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm font-semibold text-danger">{error ? (error as Error).message : "Project not found."}</p>
        <Link to="/projects" className="mt-2 inline-block text-sm font-semibold text-accent">
          Back to projects
        </Link>
      </div>
    );
  }

  const lead = getPerson(project.leadId);
  const faculty = getPerson(project.facultyId);
  const members = project.memberIds.map((id) => getPerson(id)).filter(Boolean) as Person[];
  const availableToAdd = team.filter(
    (u) => !project.memberIds.includes(u.user_id) && u.user_id !== project.leadId && u.user_id !== project.facultyId,
  );

  const miles = MILESTONES.filter((m) => m.projectId === projectId);
  const milestones = miles.length ? miles : MILESTONES.filter((m) => m.projectId === "team-portal");

  const displayDocs = serverDocs.length
    ? serverDocs.map((d) => ({
        id: d.id,
        name: d.name,
        kind: d.kind,
        version: d.version ?? "v1.0",
        size: d.size ?? "1.2 MB",
        updatedAt: d.updatedAt ?? "Today",
        current: d.current ?? true,
      }))
    : DOCUMENTS.filter((d) => d.projectId === projectId);

  return (
    <div className="flex flex-col gap-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-navy px-2 py-0.5 font-mono text-[11px] font-semibold text-navy-fg">{project.code}</span>
          <StatusBadge value={project.status} pulse={project.status === "at_risk"} />
          <span className="text-xs text-muted">{project.cycle}</span>
        </div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{project.name}</h1>
            <p className="mt-1 text-sm text-muted">{project.abstract}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManage && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setProjectDialog(true, project)}
                className="gap-1.5"
              >
                <Edit3 className="h-3.5 w-3.5" /> Edit
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setTab("team")}>
              Team ({members.length})
            </Button>
            <Button size="sm" onClick={() => navigate({ to: "/documents" })}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Upload Spec
            </Button>

            {project.repo ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-blue-500/30 bg-blue-500/10 text-blue-300 hover:bg-blue-500/20"
                asChild
              >
                <a
                  href={project.repo.startsWith("http") ? project.repo : `https://github.com/${project.repo}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Github className="h-3.5 w-3.5 text-blue-400" /> GitHub
                </a>
              </Button>
            ) : canManage ? (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 border-dashed"
                onClick={() => setProjectDialog(true, project)}
              >
                <Github className="h-3.5 w-3.5" /> Add GitHub
              </Button>
            ) : null}

            {project.preview && (
              <Button size="sm" variant="outline" asChild>
                <a
                  href={project.preview.startsWith("http") ? project.preview : `https://${project.preview}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Live Demo
                </a>
              </Button>
            )}

            {canManage && (
              <Button
                size="sm"
                variant="danger"
                className="gap-1.5 bg-danger/10 text-danger hover:bg-danger/20 border-danger/30"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Meta label="Project lead" value={lead?.name ?? "—"} />
          <Meta label="Faculty PM" value={faculty?.name ?? "—"} />
          <Meta label="Target" value={`${project.targetDate} · ${project.targetNote}`} />
        </div>
        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs">
            <span className="font-semibold">Engineering completion</span>
            <span className="font-mono font-bold text-accent">{project.progress}%</span>
          </div>
          <ProgressBar value={project.progress} tone={progressTone(project.progress, project.status)} className="h-2.5" />
        </div>
      </Card>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks ({tasks.length})</TabsTrigger>
          <TabsTrigger value="milestones">Milestones</TabsTrigger>
          <TabsTrigger value="docs">Documents ({displayDocs.length})</TabsTrigger>
          <TabsTrigger value="team">Team ({members.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Card className="p-5">
            <h2 className="font-display text-base font-semibold">Mission</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">{project.abstract}</p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Stat label="Cohort" value={`${members.length} eng`} hint="Active on this unit" />
              <Stat label="Throughput" value="< 140ms" hint="p95 query target" />
              <Stat label="Gating" value="5 / 5" hint="TRD gates" />
            </div>
            {project.stack && project.stack.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {project.stack.map((s) => (
                  <span key={s.name} className="rounded-md bg-surface-2 px-2 py-1 font-mono text-[11px]">
                    <b>{s.name}</b> <span className="text-muted">{s.note}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </Card>
        </TabsContent>
        <TabsContent value="tasks">
          <div className="mb-3 flex justify-end">
            <Button size="sm" onClick={() => setTask(true)}>
              <Plus /> Assign task
            </Button>
          </div>
          <div className="space-y-2">
            {tasks.map((t) => (
              <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div>
                  <div className="font-mono text-[11px] text-muted">{t.code}</div>
                  <div className="text-sm font-semibold">{t.title}</div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge value={t.status} />
                  <StatusBadge value={t.priority} />
                </div>
              </Card>
            ))}
            {tasks.length === 0 ? <p className="text-sm text-muted">No tasks on this project yet.</p> : null}
          </div>
        </TabsContent>
        <TabsContent value="milestones">
          <div className="relative space-y-3 pl-2">
            {milestones.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "relative rounded-lg bg-surface p-4 shadow-sm ring-1 ring-border",
                  m.status === "active" && "ring-danger/40",
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-display text-sm font-semibold">{m.title}</h3>
                  <StatusBadge value={m.status === "done" ? "done" : m.status === "active" ? "in_progress" : "todo"} />
                </div>
                <p className="mt-1 text-sm text-muted">{m.detail}</p>
                {m.blocker ? (
                  <div className="mt-2 rounded-md bg-danger-soft p-2 text-xs text-danger">
                    Current blocker: {m.blocker}
                  </div>
                ) : null}
                <div className="mt-2 font-mono text-[11px] text-muted">
                  {m.date} · {m.meta}
                  {m.score ? ` · ${m.score}` : ""}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="docs">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-base font-semibold">Project Documents ({displayDocs.length})</h2>
            <Button size="sm" onClick={() => navigate({ to: "/documents" })}>
              <Plus className="mr-1 h-3.5 w-3.5" /> Upload Spec
            </Button>
          </div>
          <div className="space-y-2">
            {(displayDocs.length ? displayDocs : DOCUMENTS.slice(0, 3)).map((d) => (
              <Card key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-navy-fg">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      {d.name}
                      {d.current ? <StatusBadge value="approved" /> : null}
                    </div>
                    <div className="font-mono text-[11px] text-muted">
                      {d.version} · {d.size} · {d.updatedAt}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleDownloadDoc(d.id, d.name)}>
                    <ExternalLink className="mr-1 h-3.5 w-3.5" /> Open
                  </Button>
                  {canDeleteDocs && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => setDocToDelete({ id: d.id, name: d.name })}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  )}
                </div>
              </Card>
            ))}
            {displayDocs.length === 0 && (
              <p className="text-sm text-muted">No documents uploaded for this project yet.</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="team">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-semibold">Team Members ({members.length})</h2>
              <p className="text-xs text-muted">Active engineers, leads, and faculty assigned to this project.</p>
            </div>
            {canManageMembers && (
              <Button size="sm" onClick={() => setAddMemberOpen(true)} className="gap-1.5">
                <UserPlus className="h-3.5 w-3.5" /> Add Member
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => {
              const isLead = m.id === project.leadId;
              const isFaculty = m.id === project.facultyId;
              return (
                <Card key={m.id} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <PersonAvatar person={m} showPresence />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{m.name}</span>
                        {isLead ? (
                          <span className="rounded bg-accent/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-accent">
                            Lead
                          </span>
                        ) : isFaculty ? (
                          <span className="rounded bg-blue-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-blue-400">
                            Faculty
                          </span>
                        ) : (
                          <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-muted">
                            Member
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted">{m.title} · {m.email}</div>
                    </div>
                  </div>
                  {canManageMembers && !isLead && !isFaculty && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      title="Remove from project"
                      onClick={() => setMemberToRemove({ id: m.id, name: m.name })}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent" /> Add Team Member to {project.code}
            </DialogTitle>
            <DialogDescription>
              Assign registered engineers or leads to this project. Team leads can manage member assignments.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMember} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Select user</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose engineer or lead..." />
                </SelectTrigger>
                <SelectContent>
                  {availableToAdd.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.name} ({u.role.toUpperCase()} · {u.dept || u.email})
                    </SelectItem>
                  ))}
                  {availableToAdd.length === 0 && (
                    <div className="p-2 text-center text-xs text-muted">All registered team members are already on this project.</div>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Project Role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as "member" | "lead")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Team Member / Intern</SelectItem>
                  <SelectItem value="lead">Co-Lead</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setAddMemberOpen(false)}
                disabled={addMemberMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!selectedUserId || addMemberMutation.isPending}>
                {addMemberMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...
                  </>
                ) : (
                  "Add to Project"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation Dialog */}
      <Dialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <Trash2 className="h-5 w-5" /> Remove Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove <strong>{memberToRemove?.name}</strong> from{" "}
              <strong>{project.name}</strong>? They will no longer have access to this project's tasks and documents.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setMemberToRemove(null)}
              disabled={removeMemberMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleRemoveMemberConfirm}
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Removing...
                </>
              ) : (
                "Remove Member"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Document Confirmation Dialog */}
      <Dialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <Trash2 className="h-5 w-5" /> Delete Document
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{docToDelete?.name}</strong>? This action will permanently remove the document and its stored file.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDocToDelete(null)}
              disabled={deleteDocMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteDocConfirm}
              disabled={deleteDocMutation.isPending}
            >
              {deleteDocMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                "Delete Document"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-danger flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Delete Project ({project.code})
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete <strong>{project.name}</strong>?
              This action cannot be undone and will remove all associated tasks, milestones, and reports.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={deleteProjectMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDeleteProject}
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

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="text-[11px] uppercase tracking-wider text-subtle">{label}</div>
      <div className="font-display text-sm font-semibold">{value}</div>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-lg bg-surface-2 p-3">
      <div className="text-[11px] uppercase tracking-wider text-subtle">{label}</div>
      <div className="font-display text-2xl font-bold">{value}</div>
      <div className="font-mono text-[11px] text-muted">{hint}</div>
    </div>
  );
}
