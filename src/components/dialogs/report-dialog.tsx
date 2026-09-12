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
import { TODAY } from "@/lib/seed";
import { useHub } from "@/lib/store";
import { useSubmitReportMutation, useMeQuery, useProjectsQuery } from "@/lib/api-hooks";

export function ReportDialog() {
  const open = useHub((s) => s.reportDialogOpen);
  const setOpen = useHub((s) => s.setReportDialog);
  const submitReport = useSubmitReportMutation();
  const { data: meData } = useMeQuery();
  const { data: projects = [] } = useProjectsQuery();

  const [hours, setHours] = useState("6.5");
  const [completed, setCompleted] = useState(
    "Completed session storage wiring and database schema integration.",
  );
  const [blockers, setBlockers] = useState("");

  const defaultProjectId = meData?.profile
    ? projects.find((p) => p.memberIds.includes(meData.profile!.user_id))?.id ?? projects[0]?.id ?? "team-portal"
    : projects[0]?.id ?? "team-portal";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await submitReport.mutateAsync({
        projectId: defaultProjectId,
        date: TODAY,
        hours: Number(hours) || 0,
        completed: completed.trim(),
        next: "Continue assigned sprint work tomorrow.",
        blockers: blockers.trim(),
        progress: 70,
        taskCodes: [],
      });

      toast.success("Daily report filed", {
        description: `Sent to faculty guides · ${hours}h logged.`,
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
            {TODAY} · routed to Dr. Shaik and your project lead.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-3" onSubmit={onSubmit}>
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
          <div className="flex flex-col gap-1">
            <Label htmlFor="done">Accomplishments</Label>
            <Textarea
              id="done"
              rows={3}
              value={completed}
              onChange={(e) => setCompleted(e.target.value)}
              required
              disabled={submitReport.isPending}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="block">Blockers (optional)</Label>
            <Input
              id="block"
              placeholder="e.g. Waiting on Redis TLS credentials"
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
                "Submit for review"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
