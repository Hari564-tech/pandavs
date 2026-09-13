import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2, Github, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useHub } from "@/lib/store";
import {
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useTeamQuery,
} from "@/lib/api-hooks";

export function ProjectDialog() {
  const open = useHub((s) => s.projectDialogOpen);
  const setOpen = useHub((s) => s.setProjectDialog);
  const editProjectData = useHub((s) => s.projectDialogEditData);

  const createProject = useCreateProjectMutation();
  const updateProject = useUpdateProjectMutation();
  const { data: team = [] } = useTeamQuery();

  const isEditing = Boolean(editProjectData?.id);

  // Form states
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [status, setStatus] = useState<"planning" | "healthy" | "at_risk" | "delayed">("planning");
  const [progress, setProgress] = useState<number>(0);
  const [leadId, setLeadId] = useState("");
  const [facultyId, setFacultyId] = useState("");
  const [targetDate, setTargetDate] = useState("2026-11-20");
  const [targetNote, setTargetNote] = useState("Sprint Kickoff");
  const [cycle, setCycle] = useState("Sprint 01");
  const [abstract, setAbstract] = useState("");

  const leads = team.filter((u) => u.role === "lead" || u.role === "super_admin");
  const facultyList = team.filter((u) => u.role === "faculty" || u.role === "super_admin");

  useEffect(() => {
    if (editProjectData) {
      setName(editProjectData.name || "");
      setCode(editProjectData.code || "");
      setSubtitle(editProjectData.subtitle || "");
      setRepoUrl(editProjectData.repo || editProjectData.repo_url || "");
      setPreviewUrl(editProjectData.preview || editProjectData.preview_url || "");
      setStatus(editProjectData.status || "planning");
      setProgress(editProjectData.progress ?? 0);
      setLeadId(editProjectData.leadId || editProjectData.lead_id || leads[0]?.user_id || "");
      setFacultyId(editProjectData.facultyId || editProjectData.faculty_id || facultyList[0]?.user_id || "");
      setTargetDate(editProjectData.targetDate || editProjectData.target_date || "2026-11-20");
      setTargetNote(editProjectData.targetNote || editProjectData.target_note || "Milestone 1");
      setCycle(editProjectData.cycle || "Sprint 01");
      setAbstract(editProjectData.abstract || "");
    } else {
      setName("");
      setCode("");
      setSubtitle("Active capstone engineering unit");
      setRepoUrl("");
      setPreviewUrl("");
      setStatus("planning");
      setProgress(0);
      setLeadId(leads[0]?.user_id || team[0]?.user_id || "");
      setFacultyId(facultyList[0]?.user_id || team[0]?.user_id || "");
      setTargetDate("2026-11-20");
      setTargetNote("Sprint Kickoff");
      setCycle("Sprint 01");
      setAbstract("");
    }
  }, [editProjectData, open]);

  const isPending = createProject.isPending || updateProject.isPending;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Project name is required");
      return;
    }

    const projCode = (code.trim() || (isEditing ? editProjectData.code : `PROJ-${Math.floor(Math.random() * 80 + 10)}`)).toUpperCase();
    const effectiveLeadId = leadId || leads[0]?.user_id || "vardan";
    const effectiveFacultyId = facultyId || facultyList[0]?.user_id || "shaik";

    try {
      if (isEditing) {
        await updateProject.mutateAsync({
          projectId: editProjectData.id,
          data: {
            name: name.trim(),
            code: projCode,
            subtitle: subtitle.trim() || "Active capstone unit",
            status,
            progress: Number(progress),
            leadId: effectiveLeadId,
            facultyId: effectiveFacultyId,
            targetDate: targetDate.trim() || "2026-11-20",
            targetNote: targetNote.trim() || "Milestone 1",
            abstract: abstract.trim() || "Under faculty review.",
            repoUrl: repoUrl.trim(),
            previewUrl: previewUrl.trim() || undefined,
            cycle: cycle.trim() || "Sprint 01",
          },
        });
        toast.success("Project updated successfully", { description: `${projCode} · ${name}` });
      } else {
        await createProject.mutateAsync({
          code: projCode,
          name: name.trim(),
          subtitle: subtitle.trim() || "Newly registered capstone",
          leadId: effectiveLeadId,
          facultyId: effectiveFacultyId,
          targetDate: targetDate.trim() || "2026-11-20",
          targetNote: targetNote.trim() || "Sprint Kickoff",
          abstract: abstract.trim() || "Proposal under faculty review.",
          repoUrl: repoUrl.trim() || `Hari564-tech/${projCode.toLowerCase()}`,
          previewUrl: previewUrl.trim() || undefined,
        });
        toast.success("Project registered successfully", { description: `${projCode} · ${name}` });
      }

      setOpen(false);
    } catch (err: unknown) {
      console.error("Project submission error:", err);
      toast.error(isEditing ? "Failed to update project" : "Failed to register project", {
        description: (err as Error)?.message || "Server error occurred",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => setOpen(v)}>
      <DialogContent className="sm:max-w-[620px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            {isEditing ? `Edit Project (${editProjectData?.code})` : "Register a New Project"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update capstone specifications, GitHub repository link, progress, and lead faculty."
              : "Creates a new capstone research unit on the operations board."}
          </DialogDescription>
        </DialogHeader>

        <form className="flex flex-col gap-4 py-2" onSubmit={onSubmit}>
          {/* Row 1: Name and Code */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="pname" className="text-xs font-semibold">
                Project Name <span className="text-danger">*</span>
              </Label>
              <Input
                id="pname"
                placeholder="e.g. Autonomous Ground Rover"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pcode" className="text-xs font-semibold">
                Code
              </Label>
              <Input
                id="pcode"
                placeholder="e.g. PROJ-007"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Row 2: Subtitle */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="psubtitle" className="text-xs font-semibold">
              Subtitle / Focus Area
            </Label>
            <Input
              id="psubtitle"
              placeholder="e.g. AI-Powered Navigation & Telemetry System"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Row 3: GitHub Repo & Live Preview URLs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="prepo" className="text-xs font-semibold flex items-center gap-1.5">
                <Github className="h-3.5 w-3.5" /> GitHub Repository Link
              </Label>
              <Input
                id="prepo"
                placeholder="e.g. https://github.com/Hari564-tech/pandavs"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ppreview" className="text-xs font-semibold flex items-center gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" /> Live Preview / Demo URL
              </Label>
              <Input
                id="ppreview"
                placeholder="e.g. https://pandavs-1.onrender.com"
                value={previewUrl}
                onChange={(e) => setPreviewUrl(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Row 4: Status and Progress */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pstatus" className="text-xs font-semibold">
                Operational Status
              </Label>
              <Select
                value={status}
                onValueChange={(v: "planning" | "healthy" | "at_risk" | "delayed") => setStatus(v)}
                disabled={isPending}
              >
                <SelectTrigger id="pstatus">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="healthy">Healthy</SelectItem>
                  <SelectItem value="at_risk">At Risk</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <Label htmlFor="pprogress" className="text-xs font-semibold">
                  Progress Percentage
                </Label>
                <span className="font-mono text-xs font-bold text-accent">{progress}%</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="pprogress"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  disabled={isPending}
                  className="w-full accent-blue-600"
                />
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                  disabled={isPending}
                  className="w-16 h-8 text-center font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Row 5: Lead & Faculty Guide */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="plead" className="text-xs font-semibold">
                Project Lead
              </Label>
              <Select value={leadId} onValueChange={setLeadId} disabled={isPending}>
                <SelectTrigger id="plead">
                  <SelectValue placeholder="Select lead" />
                </SelectTrigger>
                <SelectContent>
                  {team.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.name} ({u.role.replace("_", " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pfaculty" className="text-xs font-semibold">
                Faculty PM / Guide
              </Label>
              <Select value={facultyId} onValueChange={setFacultyId} disabled={isPending}>
                <SelectTrigger id="pfaculty">
                  <SelectValue placeholder="Select faculty" />
                </SelectTrigger>
                <SelectContent>
                  {team.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.name} ({u.role.replace("_", " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Row 6: Target Date, Note & Cycle */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ptargetDate" className="text-xs font-semibold">
                Target Date
              </Label>
              <Input
                id="ptargetDate"
                placeholder="2026-11-20"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ptargetNote" className="text-xs font-semibold">
                Milestone Note
              </Label>
              <Input
                id="ptargetNote"
                placeholder="Sprint Review"
                value={targetNote}
                onChange={(e) => setTargetNote(e.target.value)}
                disabled={isPending}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="pcycle" className="text-xs font-semibold">
                Cycle
              </Label>
              <Input
                id="pcycle"
                placeholder="Sprint 01"
                value={cycle}
                onChange={(e) => setCycle(e.target.value)}
                disabled={isPending}
              />
            </div>
          </div>

          {/* Row 7: Abstract */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pabs" className="text-xs font-semibold">
              Abstract & Scope
            </Label>
            <Textarea
              id="pabs"
              rows={3}
              placeholder="Detailed project scope, architecture overview, and target milestones..."
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              disabled={isPending}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? "Saving changes..." : "Registering..."}
                </>
              ) : isEditing ? (
                "Save changes"
              ) : (
                "Create project"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
