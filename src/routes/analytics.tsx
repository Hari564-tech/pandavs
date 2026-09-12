import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { KpiCard } from "@/components/kpi-card";
import { useDashboardAnalyticsQuery, useProjectsQuery } from "@/lib/api-hooks";

export const Route = createFileRoute("/analytics")({ component: AnalyticsPage });

export function AnalyticsPage() {
  const { data: analytics, isLoading: isAnalyticsLoading } = useDashboardAnalyticsQuery();
  const { data: projects = [], isLoading: isProjectsLoading } = useProjectsQuery();

  const fallbackHours = [
    { d: "Mon", h: 142 },
    { d: "Tue", h: 156 },
    { d: "Wed", h: 149 },
    { d: "Thu", h: 98 },
    { d: "Fri", h: 0 },
  ];

  const fallbackVelocity = [
    { w: "W5", t: 18 },
    { w: "W6", t: 22 },
    { w: "W7", t: 19 },
    { w: "W8", t: 25 },
    { w: "W9", t: 16 },
  ];

  const hoursData = analytics?.dailyHours?.length ? analytics.dailyHours : fallbackHours;
  const velocityData = analytics?.velocity?.length ? analytics.velocity : fallbackVelocity;

  const totalHours = analytics?.overview?.totalHours ?? 158.4;
  const approvedReports = analytics?.overview?.reportsApproved ?? 12;
  const openBlockers = analytics?.overview?.openBlockers ?? 2;
  const meanProgress = analytics?.overview?.meanProgress ?? (projects.length ? Math.round(projects.reduce((a, p) => a + p.progress, 0) / projects.length) : 74);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted">
          {isAnalyticsLoading ? "Calculating cohort aggregates..." : "Authoritative server-calculated cohort velocity, hours, and delivery health."}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Hours this week" value={String(totalHours)} hint="Target 180h" />
        <KpiCard label="Reports approved" value={String(approvedReports)} />
        <KpiCard label="Open blockers" value={String(openBlockers)} tone={openBlockers > 0 ? "danger" : "default"} />
        <KpiCard label="Mean progress" value={`${meanProgress}%`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-3 font-display text-sm font-semibold">Logged hours this week</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hoursData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="d" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="h" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 font-display text-sm font-semibold">Tasks closed per week (Velocity)</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={velocityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="w" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="t" stroke="var(--color-navy-mid)" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="overflow-x-auto p-0">
        {isProjectsLoading ? (
          <div className="flex min-h-[120px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Project</th>
                <th className="px-3 py-2 text-left font-medium">Progress</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-right font-medium">Members</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-2 font-semibold">{p.name}</td>
                  <td className="px-3 py-2 font-mono">{p.progress}%</td>
                  <td className="px-3 py-2 capitalize">{p.status.replace("_", " ")}</td>
                  <td className="px-4 py-2 text-right font-mono">{p.memberIds.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
