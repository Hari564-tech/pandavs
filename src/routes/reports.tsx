import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TODAY, TODAY_LABEL } from "@/lib/seed";
import { cn } from "@/lib/utils";
import {
  useReportsQuery,
  useSubmitReportMutation,
  useReviewReportMutation,
  useMeQuery,
  useProjectsQuery,
  useTeamQuery,
} from "@/lib/api-hooks";
import type { Person } from "@/lib/types";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

export function ReportsPage() {
  const { data: meData } = useMeQuery();
  const { data: reports = [] } = useReportsQuery();
  const { data: projects = [] } = useProjectsQuery();
  const { data: team = [] } = useTeamQuery();

  const submitReport = useSubmitReportMutation();
  const reviewReport = useReviewReportMutation();

  const currentRole = meData?.profile?.role ?? "member";
  const isLeadOrAdmin = currentRole === "lead" || currentRole === "faculty" || currentRole === "super_admin";

  const [mode, setMode] = useState<"member" | "admin">(isLeadOrAdmin ? "admin" : "member");
  const [hours, setHours] = useState(6.5);
  const [completed, setCompleted] = useState(
    "• Completed full-stack database schema migrations.\n• Implemented Kysely repositories and domain services.\n• Tested RBAC authorization rules across all persona roles.",
  );
  const [next, setNext] = useState(
    "• Integrate chat and document versioning with storage.\n• Run Playwright and smoke verification.",
  );
  const [blockers, setBlockers] = useState("");
  const [progress, setProgress] = useState(75);
  const [pr, setPr] = useState("https://github.com/rvit-tech/team-portal/pull/42");
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "team-portal");
  const [feedback, setFeedback] = useState("");
  const [hoursOk, setHoursOk] = useState(true);
  const [prOk, setPrOk] = useState(true);
  const [blockOk, setBlockOk] = useState(true);

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
    return undefined;
  };

  const queue = useMemo(
    () => reports.filter((r) => r.status === "submitted").sort((a, b) => (b.report_date || "").localeCompare(a.report_date || "")),
    [reports],
  );

  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const selected = queue.find((r) => r.id === selectedReportId) ?? queue[0] ?? reports[0];
  const author = selected ? getPerson(selected.author_id) : undefined;
  const history = reports.filter((r) => r.author_id === selected?.author_id && r.id !== selected?.id).slice(0, 5);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      await submitReport.mutateAsync({
        projectId: projectId || projects[0]?.id || "team-portal",
        date: TODAY,
        hours,
        completed: completed.trim(),
        next: next.trim(),
        blockers: blockers.trim(),
        progress,
        prUrl: pr.trim() || undefined,
        taskCodes: ["PROJ-204", "PROJ-218"],
      });
      toast.success("Report added successfully", { description: "Daily report logged and approved directly." });
    } catch (err: unknown) {
      toast.error("Failed to submit report", {
        description: (err as Error)?.message || "Server error occurred",
      });
    }
  }

  async function handleReview(status: "approved" | "revision") {
    if (!selected) return;
    try {
      await reviewReport.mutateAsync({
        reportId: selected.id,
        status,
        feedback: feedback.trim() || (status === "approved" ? "Verified and approved." : "Please attach logs/evidence."),
      });
      toast.success(status === "approved" ? "Report approved" : "Revision requested", {
        description: `${selected.hours}h evaluated.`,
      });
      setFeedback("");
    } catch (err: unknown) {
      toast.error("Review failed", {
        description: (err as Error)?.message || "Cannot review own report or unauthorized",
      });
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">Operational standard · Dual perspective</div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Daily work reporting
            <span className="mt-1 block text-lg font-medium text-muted sm:ml-2 sm:mt-0 sm:inline">{TODAY_LABEL}</span>
          </h1>
        </div>
        <div className="flex rounded-full bg-surface-2 p-1">
          <button
            className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", mode === "member" && "bg-surface shadow-sm")}
            onClick={() => setMode("member")}
          >
            Member submission
          </button>
          <button
            className={cn("rounded-full px-3 py-1.5 text-xs font-semibold", mode === "admin" && "bg-surface shadow-sm")}
            onClick={() => setMode("admin")}
          >
            Lead review {queue.length ? <span className="ml-1 rounded-full bg-gold-soft px-1.5 text-gold">{queue.length}</span> : null}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniKpi label="Submissions today" value={`${reports.length}/28`} hint="Logged in database" />
        <MiniKpi
          label="Blocked issues"
          value={String(reports.filter((r) => Boolean(r.blockers)).length)}
          hint="Active blockers"
          danger={reports.filter((r) => Boolean(r.blockers)).length > 0}
        />
        <MiniKpi
          label="Total logged hours"
          value={`${reports.reduce((acc, r) => acc + Number(r.hours || 0), 0).toFixed(1)}h`}
          hint="Team execution"
        />
        <MiniKpi
          label="Pending reviews"
          value={String(queue.length)}
          hint="In review queue"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <Card className={cn("p-5 lg:col-span-8", mode === "admin" && "hidden lg:block")}>
          <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-3">
            <div>
              <h2 className="font-display text-sm font-semibold">Submit daily progress</h2>
              <p className="text-xs text-muted">Mandatory EOD checkpoint for internship credit</p>
            </div>
            <span className="rounded-full bg-surface-2 px-2 py-1 font-mono text-[11px]">{TODAY_LABEL}</span>
          </div>
          <form className="flex flex-col gap-4" onSubmit={onSubmit}>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label>Associated project</Label>
                <select
                  className="h-9 rounded-md border border-border bg-surface px-3 text-sm"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  disabled={submitReport.isPending}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Active sprint</Label>
                <div className="flex h-9 items-center justify-between rounded-md bg-surface-2 px-3 font-mono text-xs">
                  Sprint 04 · Core IAM <span className="rounded bg-surface px-1.5 text-accent">Wk 6</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label>Work completed today</Label>
              <Textarea
                className="font-mono text-xs"
                rows={4}
                value={completed}
                onChange={(e) => setCompleted(e.target.value)}
                required
                disabled={submitReport.isPending}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Next steps</Label>
              <Textarea
                className="font-mono text-xs"
                rows={3}
                value={next}
                onChange={(e) => setNext(e.target.value)}
                required
                disabled={submitReport.isPending}
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="flex items-center gap-2">
                Blockers
                {blockers ? <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] uppercase text-white">Active</span> : null}
              </Label>
              <Textarea
                className="font-mono text-xs"
                rows={2}
                placeholder="None or describe roadblocks..."
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                disabled={submitReport.isPending}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 rounded-xl bg-surface-2 p-3 md:grid-cols-2">
              <div>
                <Label>Hours worked</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={14}
                    step={0.5}
                    className="font-mono font-bold"
                    value={hours}
                    onChange={(e) => setHours(Number(e.target.value))}
                    disabled={submitReport.isPending}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setHours(Math.max(0, hours - 0.5))}
                    disabled={submitReport.isPending}
                  >
                    -
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setHours(Math.min(14, hours + 0.5))}
                    disabled={submitReport.isPending}
                  >
                    +
                  </Button>
                </div>
              </div>
              <div>
                <div className="flex justify-between">
                  <Label>Task progress</Label>
                  <span className="font-mono text-sm font-bold text-accent">{progress}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={(e) => setProgress(Number(e.target.value))}
                  className="mt-3 w-full accent-[var(--color-accent)]"
                  disabled={submitReport.isPending}
                />
              </div>
            </div>
            <div>
              <Label>Evidence (PR or Demo URL)</Label>
              <Input
                className="mt-1 font-mono text-xs"
                value={pr}
                onChange={(e) => setPr(e.target.value)}
                disabled={submitReport.isPending}
              />
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => toast.message("Draft saved locally")}
                disabled={submitReport.isPending}
              >
                Save draft
              </Button>
              <Button type="submit" disabled={submitReport.isPending}>
                {submitReport.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit daily report"
                )}
              </Button>
            </div>
          </form>
        </Card>

        <Card className={cn("sticky top-20 flex flex-col gap-4 p-4 lg:col-span-4", mode === "member" && "hidden lg:flex")}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-subtle">Lead evaluation</span>
            <span className="rounded-full bg-warn-soft px-2 py-0.5 font-mono text-[10px] font-bold text-warn">
              {queue.length > 0 ? `${queue.length} Pending` : "Queue clear"}
            </span>
          </div>
          {author && selected ? (
            <div className="flex items-center gap-3">
              <PersonAvatar person={author} showPresence />
              <div>
                <div className="font-display text-sm font-semibold">{author.name}</div>
                <div className="text-xs text-muted">{author.title}</div>
                <div className="font-mono text-[11px] text-subtle">
                  Date: {selected.report_date} · {selected.hours}h
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted">Select a report from the review queue.</p>
          )}

          {selected ? (
            <>
              <div className="rounded-lg bg-surface-2 px-3 py-2 font-mono text-[11px] font-bold">
                Status: {selected.status}
              </div>
              <div className="max-h-40 overflow-y-auto rounded-lg bg-surface-2 p-2 font-mono text-[11px] text-ink">
                <b>Completed:</b>
                <p className="whitespace-pre-wrap">{selected.completed}</p>
                {selected.blockers ? (
                  <p className="mt-1 text-danger"><b>Blockers:</b> {selected.blockers}</p>
                ) : null}
              </div>
              <div className="space-y-2">
                <CheckRow checked={hoursOk} onChange={setHoursOk} title={`Hours verified (${selected.hours}h)`} hint="Consistent with activity" />
                <CheckRow checked={prOk} onChange={setPrOk} title="PR / Evidence linked" hint={selected.pr_url ?? "No PR attached"} />
                <CheckRow checked={blockOk} onChange={setBlockOk} title="Blocker awareness" hint={selected.blockers ? "Blocker acknowledged" : "No blockers reported"} warn={Boolean(selected.blockers)} />
              </div>
              <div>
                <Label>Supervisor feedback</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  placeholder="Notes visible to the author"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  disabled={reviewReport.isPending}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  onClick={() => handleReview("revision")}
                  disabled={reviewReport.isPending || selected.status === "approved"}
                >
                  Request revision
                </Button>
                <Button
                  variant="success"
                  onClick={() => handleReview("approved")}
                  disabled={reviewReport.isPending || selected.status === "approved"}
                >
                  {reviewReport.isPending ? "Reviewing..." : "Approve"}
                </Button>
              </div>
            </>
          ) : null}

          {history.length > 0 ? (
            <div>
              <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-subtle">Past reports</div>
              <div className="space-y-1">
                {history.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedReportId(r.id)}
                    className="flex w-full items-center justify-between rounded-md bg-surface-2 px-2 py-1.5 text-xs hover:bg-surface"
                  >
                    <span>{r.report_date}</span>
                    <span className="flex items-center gap-2 font-mono">
                      {r.hours}h <StatusBadge value={r.status} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </Card>
      </div>
    </div>
  );
}

function MiniKpi({ label, value, hint, danger }: { label: string; value: string; hint: string; danger?: boolean }) {
  return (
    <Card className="p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={cn("font-display text-2xl font-bold", danger && "text-danger")}>{value}</div>
      <div className="font-mono text-[11px] text-muted">{hint}</div>
    </Card>
  );
}

function CheckRow({
  checked,
  onChange,
  title,
  hint,
  warn,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint: string;
  warn?: boolean;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2 rounded-lg p-2", warn ? "bg-warn-soft" : "bg-success-soft/70")}>
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(Boolean(v))} className="mt-0.5" />
      <span>
        <span className="block text-xs font-semibold">{title}</span>
        <span className="font-mono text-[11px] text-muted">{hint}</span>
      </span>
    </label>
  );
}
