import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { COMPLIANCE_TODAY, PEOPLE } from "@/lib/seed";
import {
  useReportsQuery,
  useReviewReportMutation,
  useTeamQuery,
  usePingMemberMutation,
  usePingAllPendingMutation,
} from "@/lib/api-hooks";
import type { Person } from "@/lib/types";

export const Route = createFileRoute("/reviews")({ component: ReviewsPage });

function ReviewsPage() {
  const { data: reports = [], isLoading, isError, error, refetch } = useReportsQuery();
  const { data: team = [] } = useTeamQuery();
  const reviewMutation = useReviewReportMutation();
  const pingMember = usePingMemberMutation();
  const pingAllPending = usePingAllPendingMutation();

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

  const queue = reports.filter((r) => r.status === "submitted" || r.status === "revision");

  const handleReview = async (reportId: string, status: "approved" | "revision", authorName?: string) => {
    try {
      await reviewMutation.mutateAsync({
        reportId,
        status,
        feedback: status === "approved" ? "Verified and approved by supervisor." : "Please expand details on current blockers.",
      });
      toast.success(status === "approved" ? "Report approved" : "Revision requested", {
        description: authorName ? `Feedback sent to ${authorName}` : undefined,
      });
    } catch (err: unknown) {
      toast.error("Review action failed", {
        description: (err as Error)?.message || "You may not be authorized to review this report.",
      });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Report reviews</h1>
        <p className="text-sm text-muted">
          {isLoading ? "Checking review queue..." : `${queue.length} in queue · ${COMPLIANCE_TODAY.pending.length} unfiled today.`}
        </p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted">Loading pending reviews...</p>
        </div>
      ) : isError ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-danger-soft p-6 text-center">
          <p className="text-sm font-semibold text-danger">Failed to load reports: {(error as Error)?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : queue.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          No reports currently pending your evaluation. Queue is fully cleared!
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {queue.map((r) => {
            const who = getPerson(r.author_id);
            return (
              <Card key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {who ? <PersonAvatar person={who} /> : null}
                    <div>
                      <div className="font-semibold">{who?.name ?? "Team Member"}</div>
                      <div className="font-mono text-[11px] text-muted">
                        Date: {r.report_date} · {r.hours}h · Progress: {r.progress}%
                      </div>
                    </div>
                  </div>
                  <StatusBadge value={r.status} />
                </div>
                <div className="mt-3 rounded-lg bg-surface-2 p-2.5 font-mono text-xs">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-subtle">Completed Work:</div>
                  <p className="whitespace-pre-wrap text-ink mt-0.5">{r.completed}</p>
                  {r.next_steps ? (
                    <>
                      <div className="mt-2 text-[10px] font-bold uppercase tracking-wider text-subtle">Next Steps:</div>
                      <p className="whitespace-pre-wrap text-muted mt-0.5">{r.next_steps}</p>
                    </>
                  ) : null}
                </div>
                {r.blockers ? (
                  <p className="mt-2 text-xs text-danger">
                    <b>Blocker:</b> {r.blockers}
                  </p>
                ) : null}
                {r.pr_url ? (
                  <p className="mt-1 font-mono text-[11px] text-accent">
                    PR / Link: <a href={r.pr_url} target="_blank" rel="noreferrer" className="underline">{r.pr_url}</a>
                  </p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    disabled={reviewMutation.isPending}
                    onClick={() => handleReview(r.id, "approved", who?.name)}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={reviewMutation.isPending}
                    onClick={() => handleReview(r.id, "revision", who?.name)}
                  >
                    Request revision
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm font-semibold">Unfiled today (Automated Reminder Queue)</h2>
            <p className="text-xs text-muted">Send automated notifications directly to engineers pending standups.</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            disabled={pingAllPending.isPending || COMPLIANCE_TODAY.pending.length === 0}
            onClick={async () => {
              try {
                await pingAllPending.mutateAsync(COMPLIANCE_TODAY.pending);
                toast.success(`Sent reminders to all ${COMPLIANCE_TODAY.pending.length} unfiled members`);
              } catch {
                toast.error("Failed to send reminders");
              }
            }}
          >
            {pingAllPending.isPending ? "Sending..." : "Remind All via Notification"}
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {COMPLIANCE_TODAY.pending.map((id) => {
            const p = getPerson(id) ?? PEOPLE.find((x) => x.id === id);
            if (!p) return null;
            return (
              <Button
                key={id}
                size="sm"
                variant="outline"
                disabled={pingMember.isPending}
                onClick={async () => {
                  try {
                    await pingMember.mutateAsync(id);
                    toast.success(`EOD reminder sent to ${p.name}`);
                  } catch {
                    toast.error(`Failed to send reminder to ${p.name}`);
                  }
                }}
              >
                <PersonAvatar person={p} size="xs" /> Ping {p.name}
              </Button>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
