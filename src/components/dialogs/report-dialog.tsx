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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHub } from "@/lib/store";
import { useSubmitReportMutation, useMeQuery, useProjectsQuery } from "@/lib/api-hooks";

function getTodayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ReportDialog() {
  const open = useHub((s) => s.reportDialogOpen);
  const setOpen = useHub((s) => s.setReportDialog);
  const submitReport = useSubmitReportMutation();
  const { data: meData } = useMeQuery();
  const { data: projects = [] } = useProjectsQuery();

  const [date, setDate] = useState<string>(getTodayDate);
  const [projectId, setProjectId] = useState<string>("");
  const [hours, setHours] = useState("6.5");
  const [completed, setCompleted] = useState(
    "Completed session storage wiring and database schema integration.",
  );
  const [nextWork, setNextWork] = useState("Continue assigned sprint work tomorrow.");
  const [blockers, setBlockers] = useState("");

  const defaultProjectId = meData?.profile
    ? projects.find((p) => p.memberIds?.includes(meData.profile!.user_id))?.id ?? projects[0]?.id ?? "team-portal"
    : projects[0]?.id ?? "team-portal";

  const effectiveProjectId = projectId || defaultProjectId;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await submitReport.mutateAsync({
        projectId: effectiveProjectId,
        date,
        hours: Number(hours) || 0,
        completed: completed.trim(),
        next: nextWork.trim() || "Continue assigned sprint work tomorrow.",
        blockers: blockers.trim(),
        progress: 70,
        taskCodes: [],
      });

      toast.success("Daily report submitted", {
        description: `Logged in PostgreSQL · ${hours}h recorded.`,
      });
      setOpen(false);
    } catch (err: unknown) {
      toast.error("Failed to submit daily report", {
        description: (err as Error)?.message || "Server rejected submission",
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Submit daily work report</DialogTitle>
          <DialogDescription>
            Direct submission · Logged permanently to PostgreSQL without approval.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <Label htmlFor="report-date">Date</Label>
              <Input
                id="report-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                disabled={submitReport.isPending}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="hours">Hours worked</Label>
              <Input
                id="hours"
                type="number"
                min={0}
                max={14}
                step={0.5}
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                required
                disabled={submitReport.isPending}
              />
            </div>
          </div>

          {projects.length > 1 && (
            <div className="flex flex-col gap-1">
              <Label>Project</Label>
              <Select
                value={effectiveProjectId}
                onValueChange={setProjectId}
                disabled={submitReport.isPending}
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
          )}

          <div className="flex flex-col gap-1">
            <Label htmlFor="done">Accomplishments</Label>
            <Textarea
              id="done"
              rows={3}
              value={completed}
              onChange={(e) => setCompleted(e.target.value)}
              placeholder="What tasks or features were completed?"
              required
              disabled={submitReport.isPending}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="next">Next steps (optional)</Label>
            <Input
              id="next"
              value={nextWork}
              placeholder="e.g. Continue assigned sprint work tomorrow."
              onChange={(e) => setNextWork(e.target.value)}
              disabled={submitReport.isPending}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="block">Blockers (optional)</Label>
            <Input
              id="block"
              placeholder="e.g. Waiting on Redis TLS credentials or PR review"
              value={blockers}
              onChange={(e) => setBlockers(e.target.value)}
              disabled={submitReport.isPending}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={submitReport.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="accent" disabled={submitReport.isPending}>
              {submitReport.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit daily report"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
