import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHub } from "@/lib/store";
import type { TaskPriority } from "@/lib/types";
import { useCreateTaskMutation, useProjectsQuery, useTeamQuery } from "@/lib/api-hooks";

export function TaskDialog() {
  const open = useHub((s) => s.taskDialogOpen);
  const setOpen = useHub((s) => s.setTaskDialog);
  const createTask = useCreateTaskMutation();
  const { data: projects = [] } = useProjectsQuery();
  const { data: team = [] } = useTeamQuery();

  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");

  const effectiveProjectId = projectId || projects[0]?.id || "";
  const effectiveAssigneeId = assigneeId || team.find((u) => u.role === "member")?.user_id || team[0]?.user_id || "";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const code = `RVIT-${Math.floor(400 + Math.random() * 200)}`;
    try {
      await createTask.mutateAsync({
        code,
        title: title.trim(),
        projectId: effectiveProjectId,
        assigneeId: effectiveAssigneeId,
        priority,
        dueAt: "2026-09-18",
        dueLabel: "Sep 18",
        subtasks: [],
      });

      toast.success("Task assigned", { description: `${code} · ${title}` });
      setTitle("");
      setOpen(false);
    } catch (err: unknown) {
      toast.error("Failed to assign task", {
        description: (err as Error)?.message || "Server error occurred",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign a task</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="flex flex-col gap-1">
            <Label>Title</Label>
            <Input
              value={title}
              placeholder="e.g. Implement CAN bus telemetry driver"
              onChange={(e) => setTitle(e.target.value)}
              required
              disabled={createTask.isPending}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label>Project</Label>
              <Select
                value={effectiveProjectId}
                onValueChange={setProjectId}
                disabled={createTask.isPending}
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
              <Label>Assignee</Label>
              <Select
                value={effectiveAssigneeId}
                onValueChange={setAssigneeId}
                disabled={createTask.isPending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {team.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      {u.name} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <Label>Priority</Label>
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as TaskPriority)}
              disabled={createTask.isPending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={createTask.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Create task"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
