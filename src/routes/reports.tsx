import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, type FormEvent } from "react";
import { toast } from "sonner";
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Edit3,
  FileText,
} from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  useReportsQuery,
  useDailyReportQuery,
  useSubmitReportMutation,
  useUpdateDailyReportMutation,
  useMeQuery,
  useProjectsQuery,
  useTeamQuery,
} from "@/lib/api-hooks";
import type { Person } from "@/lib/types";

export const Route = createFileRoute("/reports")({ component: ReportsPage });

function getInitialDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysToDate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateStr: string): string {
  if (!dateStr || !dateStr.includes("-")) return dateStr;
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ReportsPage() {
  const { data: meData } = useMeQuery();
  const { data: projects = [] } = useProjectsQuery();
  const { data: team = [] } = useTeamQuery();

  const currentUserId = meData?.profile?.user_id ?? "";
  const currentRole = meData?.profile?.role ?? "member";
  const isSupervisor = currentRole === "lead" || currentRole === "faculty" || currentRole === "super_admin";

  const [activeTab, setActiveTab] = useState<"my_reports" | "team_overview">("my_reports");
  const [selectedDate, setSelectedDate] = useState<string>(getInitialDate());
  const [selectedProjectId, setSelectedProjectId] = useState<string>(projects[0]?.id ?? "team-portal");
  const [historyProjectFilter, setHistoryProjectFilter] = useState<string>("all");

  // Form State
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [formHours, setFormHours] = useState<number>(6.5);
  const [formCompleted, setFormCompleted] = useState<string>("");
  const [formNext, setFormNext] = useState<string>("");
  const [formBlockers, setFormBlockers] = useState<string>("");
  const [formProgress, setFormProgress] = useState<number>(75);
  const [formPr, setFormPr] = useState<string>("");

  // Queries
  const { data: myReports = [], isLoading: isLoadingHistory } = useReportsQuery({
    authorId: currentUserId || undefined,
  });

  const { data: allTeamReports = [] } = useReportsQuery(
    isSupervisor && activeTab === "team_overview"
      ? { projectId: selectedProjectId !== "all" ? selectedProjectId : undefined }
      : undefined,
  );

  const {
    data: dailyReport,
    isLoading: isLoadingDailyReport,
  } = useDailyReportQuery(selectedDate, selectedProjectId, currentUserId, Boolean(currentUserId));

  // Mutations
  const submitReport = useSubmitReportMutation();
  const updateReport = useUpdateDailyReportMutation();

  // Synchronize form values when dailyReport query changes
  const activeExistingReport = useMemo(() => {
    if (dailyReport) return dailyReport;
    return myReports.find((r) => r.report_date === selectedDate && r.project_id === selectedProjectId) ?? null;
  }, [dailyReport, myReports, selectedDate, selectedProjectId]);

  const activeProject = projects.find((p) => p.id === selectedProjectId) ?? projects[0];

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

  function startEditing() {
    if (activeExistingReport) {
      setFormHours(Number(activeExistingReport.hours) || 0);
      setFormCompleted(activeExistingReport.completed || "");
      setFormNext(activeExistingReport.next || "");
      setFormBlockers(activeExistingReport.blockers || "");
      setFormProgress(activeExistingReport.progress ?? 50);
      setFormPr(activeExistingReport.prUrl || "");
    }
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!formCompleted.trim()) {
      toast.error("Accomplishments description is required");
      return;
    }

    try {
      if (activeExistingReport && isEditing) {
        // Update existing report
        await updateReport.mutateAsync({
          reportId: activeExistingReport.id,
          hours: Number(formHours),
          completed: formCompleted.trim(),
          next: formNext.trim(),
          blockers: formBlockers.trim(),
          progress: Number(formProgress),
          prUrl: formPr.trim() || undefined,
        });
        toast.success("Daily report updated successfully", {
          description: `Date: ${formatShortDate(selectedDate)} · ${activeProject?.name ?? "Project"}`,
        });
        setIsEditing(false);
      } else {
        // Direct new submission (no approval needed)
        await submitReport.mutateAsync({
          projectId: selectedProjectId,
          date: selectedDate,
          hours: Number(formHours),
          completed: formCompleted.trim(),
          next: formNext.trim(),
          blockers: formBlockers.trim(),
          progress: Number(formProgress),
          prUrl: formPr.trim() || undefined,
          taskCodes: ["PROJ-204", "PROJ-218"],
        });
        toast.success("Daily report submitted successfully", {
          description: `Date: ${formatShortDate(selectedDate)} · ${activeProject?.name ?? "Project"}`,
        });
        setIsEditing(false);
      }
    } catch (err: unknown) {
      toast.error("Failed to save daily report", {
        description: (err as Error)?.message || "Server error occurred. Please try again.",
      });
    }
  }

  // Filtered History
  const filteredHistory = useMemo(() => {
    return myReports
      .filter((r) => {
        if (historyProjectFilter !== "all" && r.project_id !== historyProjectFilter) {
          return false;
        }
        return true;
      })
      .sort((a, b) => (b.report_date || "").localeCompare(a.report_date || ""));
  }, [myReports, historyProjectFilter]);

  const totalMyHours = useMemo(() => {
    return myReports.reduce((acc, r) => acc + Number(r.hours || 0), 0).toFixed(1);
  }, [myReports]);

  const isSaving = submitReport.isPending || updateReport.isPending;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">
            Institutional Operations · Direct Submission
          </div>
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
            Daily Work Reports
          </h1>
          <p className="mt-0.5 text-xs text-muted sm:text-sm">
            Directly submitted and permanently logged in PostgreSQL — no approval required.
          </p>
        </div>

        {isSupervisor ? (
          <div className="flex rounded-full bg-surface-2 p-1">
            <button
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                activeTab === "my_reports" && "bg-surface shadow-sm text-foreground",
              )}
              onClick={() => setActiveTab("my_reports")}
            >
              My Submissions & History
            </button>
            <button
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                activeTab === "team_overview" && "bg-surface shadow-sm text-foreground",
              )}
              onClick={() => setActiveTab("team_overview")}
            >
              Team Submissions Overview
            </button>
          </div>
        ) : null}
      </div>

      {/* KPI Overview */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <MiniKpi
          label="Total Hours Logged"
          value={`${totalMyHours}h`}
          hint="Verified in database"
        />
        <MiniKpi
          label="Reports Submitted"
          value={String(myReports.length)}
          hint="Permanent records"
        />
        <MiniKpi
          label="Active Projects"
          value={String(new Set(myReports.map((r) => r.project_id)).size || (projects.length ? 1 : 0))}
          hint="Institutional capstones"
        />
        <MiniKpi
          label="Active Blockers"
          value={String(myReports.filter((r) => Boolean(r.blockers?.trim())).length)}
          hint="Needs attention"
          danger={myReports.filter((r) => Boolean(r.blockers?.trim())).length > 0}
        />
      </div>

      {activeTab === "my_reports" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left Column: Date Navigation & Report Form / Display */}
          <div className="flex flex-col gap-4 lg:col-span-7 xl:col-span-8">
            {/* Date & Project Selector Card */}
            <Card className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                {/* Date Controls */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDate((prev) => addDaysToDate(prev, -1));
                      setIsEditing(false);
                    }}
                    title="Previous Day"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <div className="relative">
                    <Input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => {
                        if (e.target.value) {
                          setSelectedDate(e.target.value);
                          setIsEditing(false);
                        }
                      }}
                      className="h-9 w-40 font-mono text-xs font-semibold"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedDate((prev) => addDaysToDate(prev, 1));
                      setIsEditing(false);
                    }}
                    title="Next Day"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedDate(getInitialDate());
                      setIsEditing(false);
                    }}
                    className="text-xs"
                  >
                    Today
                  </Button>
                </div>

                {/* Project Selector */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-muted">Project:</Label>
                  <select
                    className="h-9 rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setIsEditing(false);
                    }}
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-2 text-xs font-medium text-muted">
                Selected Date: <span className="font-semibold text-foreground">{formatDateDisplay(selectedDate)}</span>
              </div>
            </Card>

            {/* Active Report View or Submission Form */}
            {isLoadingDailyReport ? (
              <Card className="flex min-h-[350px] flex-col items-center justify-center gap-3 p-8">
                <Loader2 className="h-8 w-8 animate-spin text-accent" />
                <p className="text-xs text-muted font-mono">Checking database for {selectedDate}...</p>
              </Card>
            ) : activeExistingReport && !isEditing ? (
              /* VIEW EXISTING SUBMITTED REPORT */
              <Card className="p-6">
                <div className="flex items-start justify-between border-b border-border pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg font-bold text-foreground">
                        Daily Report for {formatShortDate(selectedDate)}
                      </span>
                      <StatusBadge value="submitted" />
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {activeProject?.name} ({activeProject?.code}) · Logged in PostgreSQL
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={startEditing}
                    className="flex items-center gap-1.5 text-xs font-semibold"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Edit Report
                  </Button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <div className="rounded-lg bg-surface-2 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted">Hours Logged</div>
                    <div className="mt-0.5 font-mono text-xl font-bold text-foreground">
                      {activeExistingReport.hours} hrs
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface-2 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted">Task Progress</div>
                    <div className="mt-0.5 font-mono text-xl font-bold text-accent">
                      {activeExistingReport.progress}%
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface-2 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted">Status</div>
                    <div className="mt-1">
                      <span className="rounded bg-success-soft px-2 py-0.5 font-mono text-xs font-bold uppercase text-success">
                        Submitted
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg bg-surface-2 p-3">
                    <div className="text-[11px] uppercase tracking-wider text-muted">Sprint</div>
                    <div className="mt-0.5 font-mono text-sm font-semibold text-foreground">
                      Sprint 04
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-4">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-subtle">
                      Work Completed Today
                    </div>
                    <div className="mt-1.5 whitespace-pre-wrap rounded-lg bg-surface-2 p-3.5 font-mono text-xs leading-relaxed text-foreground">
                      {activeExistingReport.completed || "No details provided."}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-subtle">
                      Next Steps Planned
                    </div>
                    <div className="mt-1.5 whitespace-pre-wrap rounded-lg bg-surface-2 p-3.5 font-mono text-xs leading-relaxed text-foreground">
                      {activeExistingReport.next || "None specified."}
                    </div>
                  </div>

                  {activeExistingReport.blockers?.trim() ? (
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-danger">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Active Roadblocks / Blockers
                      </div>
                      <div className="mt-1.5 whitespace-pre-wrap rounded-lg border border-danger/20 bg-danger-soft/40 p-3.5 font-mono text-xs leading-relaxed text-foreground">
                        {activeExistingReport.blockers}
                      </div>
                    </div>
                  ) : null}

                  {activeExistingReport.prUrl ? (
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider text-subtle">
                        Attached Evidence / Pull Request
                      </div>
                      <a
                        href={activeExistingReport.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-accent hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {activeExistingReport.prUrl}
                      </a>
                    </div>
                  ) : null}
                </div>
              </Card>
            ) : (
              /* FORM: CREATE OR EDIT REPORT */
              <Card className="p-6">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h2 className="font-display text-base font-bold text-foreground">
                      {activeExistingReport && isEditing
                        ? `Edit Report: ${formatShortDate(selectedDate)}`
                        : `Submit Daily Report: ${formatShortDate(selectedDate)}`}
                    </h2>
                    <p className="text-xs text-muted">
                      Direct submission — immediately saved to database with no approval step.
                    </p>
                  </div>
                  {activeExistingReport && isEditing ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelEditing}
                      className="text-xs text-muted hover:text-foreground"
                    >
                      Cancel Edit
                    </Button>
                  ) : null}
                </div>

                <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">Work Completed Today *</Label>
                    <Textarea
                      className="font-mono text-xs leading-relaxed"
                      rows={4}
                      placeholder="• Implemented feature X...&#10;• Fixed issue Y...&#10;• Wrote unit tests for module Z..."
                      value={formCompleted}
                      onChange={(e) => setFormCompleted(e.target.value)}
                      required
                      disabled={isSaving}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="text-xs font-semibold">Next Steps Planned</Label>
                    <Textarea
                      className="font-mono text-xs leading-relaxed"
                      rows={3}
                      placeholder="• Continue integration testing...&#10;• Deploy staging build..."
                      value={formNext}
                      onChange={(e) => setFormNext(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Label className="flex items-center gap-2 text-xs font-semibold">
                      Blockers / Impediments
                      {formBlockers.trim() ? (
                        <span className="rounded-full bg-danger px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                          Active
                        </span>
                      ) : null}
                    </Label>
                    <Textarea
                      className="font-mono text-xs leading-relaxed"
                      rows={2}
                      placeholder="Describe any dependency or technical blockers (or leave empty)..."
                      value={formBlockers}
                      onChange={(e) => setFormBlockers(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 rounded-xl bg-surface-2 p-3.5 md:grid-cols-2">
                    <div>
                      <Label className="text-xs font-semibold">Hours Worked</Label>
                      <div className="mt-1.5 flex items-center gap-2">
                        <Input
                          type="number"
                          min={0}
                          max={24}
                          step={0.5}
                          className="font-mono text-sm font-bold"
                          value={formHours}
                          onChange={(e) => setFormHours(Number(e.target.value))}
                          disabled={isSaving}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setFormHours(Math.max(0, formHours - 0.5))}
                          disabled={isSaving}
                        >
                          -
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setFormHours(Math.min(24, formHours + 0.5))}
                          disabled={isSaving}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between">
                        <Label className="text-xs font-semibold">Task Progress</Label>
                        <span className="font-mono text-xs font-bold text-accent">{formProgress}%</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={formProgress}
                        onChange={(e) => setFormProgress(Number(e.target.value))}
                        className="mt-3 w-full accent-[var(--color-accent)]"
                        disabled={isSaving}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold">Evidence / Pull Request Link (Optional)</Label>
                    <Input
                      type="url"
                      placeholder="https://github.com/.../pull/..."
                      className="mt-1 font-mono text-xs"
                      value={formPr}
                      onChange={(e) => setFormPr(e.target.value)}
                      disabled={isSaving}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                    {activeExistingReport && isEditing ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={cancelEditing}
                        disabled={isSaving}
                      >
                        Cancel
                      </Button>
                    ) : null}
                    <Button type="submit" disabled={isSaving} className="font-semibold">
                      {isSaving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Saving to Database...
                        </>
                      ) : activeExistingReport && isEditing ? (
                        "Save Changes"
                      ) : (
                        "Submit Daily Report"
                      )}
                    </Button>
                  </div>
                </form>
              </Card>
            )}
          </div>

          {/* Right Column: Report History Table / Past Reports */}
          <div className="flex flex-col gap-4 lg:col-span-5 xl:col-span-4">
            <Card className="flex flex-col p-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="font-display text-sm font-bold text-foreground">
                    Report History
                  </h3>
                  <p className="text-[11px] text-muted">
                    {filteredHistory.length} recorded submissions
                  </p>
                </div>

                {/* Filter by Project */}
                <select
                  className="h-7 rounded border border-border bg-surface px-2 text-[11px] font-medium text-foreground focus:outline-none"
                  value={historyProjectFilter}
                  onChange={(e) => setHistoryProjectFilter(e.target.value)}
                >
                  <option value="all">All Projects</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code}
                    </option>
                  ))}
                </select>
              </div>

              {isLoadingHistory ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-6">
                  <Loader2 className="h-6 w-6 animate-spin text-accent" />
                  <p className="text-xs text-muted">Loading history...</p>
                </div>
              ) : filteredHistory.length === 0 ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-6 text-center">
                  <FileText className="h-8 w-8 text-muted/40" />
                  <p className="text-xs font-semibold text-muted">No past reports recorded</p>
                  <p className="text-[11px] text-muted">
                    Submit your report for today using the form to start your history.
                  </p>
                </div>
              ) : (
                <div className="mt-3 flex max-h-[520px] flex-col gap-2 overflow-y-auto pr-1">
                  {filteredHistory.map((report) => {
                    const isSelected =
                      report.report_date === selectedDate && report.project_id === selectedProjectId;
                    const proj = projects.find((p) => p.id === report.project_id);

                    return (
                      <button
                        key={report.id}
                        onClick={() => {
                          setSelectedDate(report.report_date);
                          setSelectedProjectId(report.project_id);
                          setIsEditing(false);
                        }}
                        className={cn(
                          "flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-all",
                          isSelected
                            ? "border-accent bg-accent/5 shadow-xs"
                            : "border-border/70 bg-surface hover:border-accent/40 hover:bg-surface-2",
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-foreground">
                            {formatShortDate(report.report_date)}
                          </span>
                          <span className="rounded bg-success-soft px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase text-success">
                            Submitted
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted">
                          <span className="truncate font-medium text-foreground">
                            {proj?.name ?? report.project_id}
                          </span>
                          <span className="font-mono text-[11px] font-semibold text-subtle">
                            {report.hours} hrs · {report.progress}%
                          </span>
                        </div>

                        {report.completed ? (
                          <p className="line-clamp-2 text-[11px] text-muted">
                            {report.completed}
                          </p>
                        ) : null}

                        {report.blockers?.trim() ? (
                          <span className="text-[10px] font-semibold text-danger">
                            • Blockers noted
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : (
        /* SUPERVISOR: TEAM SUBMISSIONS OVERVIEW (NO APPROVAL / REJECT BUTTONS) */
        <Card className="p-6">
          <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-foreground">
                Team Submissions Log
              </h2>
              <p className="text-xs text-muted">
                Informational visibility for supervisors · Realtime record from PostgreSQL
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted">Project:</Label>
              <select
                className="h-8 rounded border border-border bg-surface px-2.5 text-xs text-foreground"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="all">All Projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-2 text-subtle">
                  <th className="p-3 font-semibold">Member</th>
                  <th className="p-3 font-semibold">Date</th>
                  <th className="p-3 font-semibold">Project</th>
                  <th className="p-3 font-semibold">Hours</th>
                  <th className="p-3 font-semibold">Progress</th>
                  <th className="p-3 font-semibold">Status</th>
                  <th className="p-3 font-semibold">Accomplishments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-sans">
                {allTeamReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted">
                      No reports found for this selection.
                    </td>
                  </tr>
                ) : (
                  allTeamReports.map((r) => {
                    const author = getPerson(r.author_id);
                    const proj = projects.find((p) => p.id === r.project_id);

                    return (
                      <tr key={r.id} className="hover:bg-surface-2/60">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            {author ? <PersonAvatar person={author} size="sm" /> : null}
                            <div>
                              <div className="font-semibold text-foreground">
                                {author?.name ?? r.author_id}
                              </div>
                              <div className="text-[10px] text-muted">{author?.dept ?? "Member"}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 font-mono text-[11px] font-medium text-foreground">
                          {formatShortDate(r.report_date)}
                        </td>
                        <td className="p-3 text-subtle font-medium">
                          {proj?.code ?? r.project_id}
                        </td>
                        <td className="p-3 font-mono font-bold text-foreground">
                          {r.hours}h
                        </td>
                        <td className="p-3 font-mono text-accent">
                          {r.progress}%
                        </td>
                        <td className="p-3">
                          <span className="rounded bg-success-soft px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-success">
                            Submitted
                          </span>
                        </td>
                        <td className="p-3 max-w-xs">
                          <p className="line-clamp-2 text-muted text-[11px]">
                            {r.completed}
                          </p>
                          {r.blockers ? (
                            <span className="text-[10px] font-semibold text-danger">
                              Blocker: {r.blockers}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

function MiniKpi({
  label,
  value,
  hint,
  danger,
}: {
  label: string;
  value: string;
  hint: string;
  danger?: boolean;
}) {
  return (
    <Card className="p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted">{label}</div>
      <div className={cn("font-display text-2xl font-bold", danger && "text-danger")}>{value}</div>
      <div className="font-mono text-[11px] text-muted">{hint}</div>
    </Card>
  );
}
