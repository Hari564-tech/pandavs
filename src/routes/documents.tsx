import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus, Download, Loader2, Upload, Trash2 } from "lucide-react";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  useDocumentsQuery,
  useProjectsQuery,
  useTeamQuery,
  useMeQuery,
  useDeleteDocumentMutation,
  usePresignUploadMutation,
  useCompleteUploadMutation,
  useUploadDocumentDirectMutation,
} from "@/lib/api-hooks";
import { getDocumentDownloadUrlFn } from "@/server/fns";
import type { DocKind, Person } from "@/lib/types";
import { PEOPLE } from "@/lib/seed";

export const Route = createFileRoute("/documents")({ component: DocumentsPage });

function DocumentsPage() {
  const [q, setQ] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // Form state
  const [docName, setDocName] = useState("");
  const [docKind, setDocKind] = useState<DocKind>("trd");
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data: documents = [], isLoading, isError, error, refetch } = useDocumentsQuery();
  const { data: projects = [] } = useProjectsQuery();
  const { data: team = [] } = useTeamQuery();
  const { data: meData } = useMeQuery();

  const presignUpload = usePresignUploadMutation();
  const completeUpload = useCompleteUploadMutation();
  const uploadDocumentDirect = useUploadDocumentDirectMutation();
  const deleteDocMutation = useDeleteDocumentMutation();

  const [docToDelete, setDocToDelete] = useState<{ id: string; name: string } | null>(null);

  const canDeleteDocs =
    meData?.profile?.role === "super_admin" ||
    meData?.profile?.role === "faculty" ||
    meData?.profile?.role === "lead";

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
        streak: 5,
        attendance: 100,
        year: fromTeam.year ?? undefined,
        reg: fromTeam.registration_no ?? undefined,
      };
    }
    return PEOPLE.find((p) => p.id === id);
  };

  const filtered = useMemo(() => {
    return documents.filter((d) => {
      if (projectFilter !== "all" && d.projectId !== projectFilter) return false;
      if (q && !d.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [documents, q, projectFilter]);

  const handleDownload = async (docId: string, name: string) => {
    try {
      const downloadUrl = await getDocumentDownloadUrlFn({ data: docId });
      if (downloadUrl) {
        window.open(downloadUrl, "_blank");
        toast.success(`Accessing signed document: ${name}`);
      } else {
        toast.info(`Document ${name} verified from private bucket`);
      }
    } catch (err: unknown) {
      toast.error("Failed to generate download URL", {
        description: (err as Error)?.message || "Unauthorized access",
      });
    }
  };

  const handleUploadSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!docName.trim()) {
      toast.error("Document name is required");
      return;
    }
    const targetProject = uploadProjectId || projects[0]?.id || "team-portal";
    const selectedFile = file;

    const mimeType = selectedFile?.type || "application/pdf";
    const fileName = selectedFile?.name || `${docName.trim().replace(/\s+/g, "_")}.pdf`;

    try {
      setIsUploading(true);
      let base64 = "";
      if (selectedFile) {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(selectedFile);
        });
      } else {
        const textContent = `# ${docName.trim()}\n\nSpecification type: ${docKind.toUpperCase()}\nProject: ${targetProject}\n`;
        base64 = `data:text/markdown;base64,${btoa(textContent)}`;
      }

      await uploadDocumentDirect.mutateAsync({
        projectId: targetProject,
        name: docName.trim(),
        kind: docKind,
        fileName,
        mimeType: selectedFile ? mimeType : "text/markdown",
        base64,
      });

      toast.success("Document uploaded & versioned", { description: `${docName} (${docKind.toUpperCase()})` });
      setDocName("");
      setFile(null);
      setUploadOpen(false);
    } catch (err: unknown) {
      console.error("Document upload error:", err);
      toast.error("Failed to upload document", {
        description: (err as Error)?.message || "Upload failed",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight">Documents & specs</h1>
          <p className="text-sm text-muted">
            {isLoading ? "Loading documents..." : "Canonical private storage for PRDs, TRDs, and architecture packs."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search documents"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-48"
          />
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-40">
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
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-1 h-4 w-4" /> Upload spec
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted">Loading documents from storage...</p>
        </div>
      ) : isError ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-danger-soft p-6 text-center">
          <p className="text-sm font-semibold text-danger">Failed to load documents: {(error as Error)?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm text-muted">No documents found matching your filter.</p>
          <Button size="sm" onClick={() => setUploadOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Upload document
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((d) => {
            const who = getPerson(d.updatedBy);
            const project = projects.find((p) => p.id === d.projectId);
            return (
              <Card key={d.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-md bg-navy text-navy-fg">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{d.name}</span>
                      {d.current ? <StatusBadge value="approved" /> : <StatusBadge value="draft" />}
                      <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">
                        {d.kind}
                      </span>
                    </div>
                    <div className="font-mono text-[11px] text-muted">
                      {project?.code ?? "CORE"} · {d.version} · {d.size} · {d.updatedAt} · {who?.name ?? "Lead"}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => handleDownload(d.id, d.name)}>
                    <Download className="mr-1 h-4 w-4" /> Open / Download
                  </Button>
                  {canDeleteDocs && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                      onClick={() => setDocToDelete({ id: d.id, name: d.name })}
                    >
                      <Trash2 className="mr-1 h-4 w-4" /> Delete
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload engineering specification</DialogTitle>
            <DialogDescription>
              Upload private project documents (PDF, DOCX, XLSX, PPTX). Version metadata is preserved.
            </DialogDescription>
          </DialogHeader>
          <form className="flex flex-col gap-3" onSubmit={handleUploadSubmit}>
            <div className="flex flex-col gap-1">
              <Label htmlFor="docName">Document title</Label>
              <Input
                id="docName"
                placeholder="e.g. System Architecture Specification v2.0"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                required
                disabled={presignUpload.isPending || completeUpload.isPending}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label>Project</Label>
                <Select
                  value={uploadProjectId || projects[0]?.id || ""}
                  onValueChange={setUploadProjectId}
                  disabled={isUploading || uploadDocumentDirect.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Document Kind</Label>
                <Select
                  value={docKind}
                  onValueChange={(v) => setDocKind(v as DocKind)}
                  disabled={isUploading || uploadDocumentDirect.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trd">TRD (Technical Spec)</SelectItem>
                    <SelectItem value="prd">PRD (Product Spec)</SelectItem>
                    <SelectItem value="arch">Architecture Pack</SelectItem>
                    <SelectItem value="spec">Interface Spec</SelectItem>
                    <SelectItem value="other">General Documentation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="docFile">Attach file</Label>
              <Input
                id="docFile"
                type="file"
                accept=".pdf,.docx,.pptx,.xlsx,.png,.jpg,.txt,.md"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                disabled={isUploading || uploadDocumentDirect.isPending}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setUploadOpen(false)}
                disabled={isUploading || uploadDocumentDirect.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isUploading || uploadDocumentDirect.isPending}>
                {isUploading || uploadDocumentDirect.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading & Versioning...
                  </>
                ) : (
                  "Upload document"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!docToDelete} onOpenChange={(open) => !open && setDocToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete "{docToDelete?.name}"? All associated versions and stored files will be removed. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setDocToDelete(null)}
              disabled={deleteDocMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="danger"
              className="bg-red-600 hover:bg-red-700 text-white"
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
    </div>
  );
}

