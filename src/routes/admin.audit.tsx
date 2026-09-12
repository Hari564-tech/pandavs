import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { PersonAvatar } from "@/components/person-avatar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuditLogsQuery, useTeamQuery } from "@/lib/api-hooks";
import type { Person } from "@/lib/types";
import { PEOPLE } from "@/lib/seed";

export const Route = createFileRoute("/admin/audit")({ component: AuditPage });

export function AuditPage() {
  const [actionFilter, setActionFilter] = useState("");
  const { data: logs = [], isLoading, isError, error, refetch } = useAuditLogsQuery({
    action: actionFilter.trim() || undefined,
  });
  const { data: team = [] } = useTeamQuery();

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
      };
    }
    return PEOPLE.find((p) => p.id === id);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold tracking-tight">Audit logs</h1>
            <span className="flex items-center gap-1 rounded bg-success-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-success">
              <ShieldCheck className="h-3.5 w-3.5" /> Immutable
            </span>
          </div>
          <p className="text-sm text-muted">Cryptographic append-only trail of privileged security events and mutations.</p>
        </div>
        <Input
          placeholder="Filter by action (e.g. role, report)"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="w-64"
        />
      </div>

      {isLoading ? (
        <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
          <p className="text-sm text-muted">Reading immutable audit records from database...</p>
        </div>
      ) : isError ? (
        <div className="flex min-h-[250px] flex-col items-center justify-center gap-3 rounded-xl border border-danger/30 bg-danger-soft p-6 text-center">
          <p className="text-sm font-semibold text-danger">Failed to fetch audit records: {(error as Error)?.message}</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : logs.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted">
          No audit records found matching your query.
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium">Actor</th>
                <th className="px-3 py-2 text-left font-medium">Action</th>
                <th className="px-3 py-2 text-left font-medium">Target</th>
                <th className="px-3 py-2 text-left font-medium">When</th>
                <th className="px-4 py-2 text-right font-medium">Origin IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((e) => {
                const who = getPerson(e.actorId);
                return (
                  <tr key={e.id} className="border-t border-border hover:bg-surface-2/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {who ? <PersonAvatar person={who} size="sm" /> : null}
                        <div>
                          <div className="font-semibold">{who?.name ?? e.actorId}</div>
                          <div className="font-mono text-[10px] text-subtle">{e.actorId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded bg-navy px-2 py-0.5 font-mono text-[11px] font-semibold text-navy-fg">
                        {e.action}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs text-muted">{e.target}</td>
                    <td className="px-3 py-3 font-mono text-xs text-muted">{e.at}</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-muted">{e.ip}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
