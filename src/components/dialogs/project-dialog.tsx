import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
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
import { useHub } from "@/lib/store";
import { useCreateProjectMutation, useTeamQuery } from "@/lib/api-hooks";

export function ProjectDialog() {
  const open = useHub((s) => s.projectDialogOpen);
  const setOpen = useHub((s) => s.setProjectDialog);
  const createProject = useCreateProjectMutation();
  const { data: team = [] } = useTeamQuery();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [abstract, setAbstract] = useState("");

  const leads = team.filter((u) => u.role === "lead" || u.role === "super_admin");
  const facultyList = team.filter((u) => u.role === "faculty" || u.role === "super_admin");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const projCode = code.trim() || `PROJ-${Math.floor(Math.random() * 80 + 10)}`;
    const leadId = leads[0]?.user_id ?? "vardan";
    const facultyId = facultyList[0]?.user_id ?? "shaik";

    try {
      await createProject.mutateAsync({
        code: projCode,
        name: name.trim(),
        subtitle: "Newly registered capstone",
        leadId,
        facultyId,
        targetDate: "2026-11-20",
        targetNote: "Sprint Kickoff",
        abstract: abstract.trim() || "Proposal under faculty review.",
        repoUrl: `rvit-tech/${projCode.toLowerCase()}`,
        previewUrl: undefined,
      });

      toast.success("Project registered", { description: `${projCode} · ${name}` });
      setName("");
      setCode("");
      setAbstract("");
      setOpen(false);
    } catch (err: unknown) {
      toast.error("Failed to register project", {
        description: (err as Error)?.message || "Server error occurred",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register a project</DialogTitle>
          <DialogDescription>Creates a new capstone unit on the operations board.</DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1">
            <Label htmlFor="pname">Project name</Label>
            <Input
              id="pname"
              placeholder="e.g. Autonomous Ground Rover"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              disabled={createProject.isPending}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="pcode">Code</Label>
            <Input
              id="pcode"
              placeholder="e.g. PROJ-007"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              disabled={createProject.isPending}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="pabs">Abstract</Label>
            <Textarea
              id="pabs"
              rows={3}
              placeholder="Project goals, scope, and target outcomes..."
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              disabled={createProject.isPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={createProject.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
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
