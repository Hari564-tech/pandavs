import { createFileRoute } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useCalendarEventsQuery } from "@/lib/api-hooks";

export const Route = createFileRoute("/calendar")({ component: CalendarPage });

const days = Array.from({ length: 30 }, (_, i) => i + 1);
const kindColor: Record<string, string> = {
  review: "bg-gold-soft text-gold-ink",
  standup: "bg-accent-soft text-accent-ink",
  deadline: "bg-danger-soft text-danger",
  lab: "bg-success-soft text-success",
  meeting: "bg-surface-2 text-ink",
};

export function CalendarPage() {
  const { data: events = [], isLoading } = useCalendarEventsQuery();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted">
          {isLoading ? "Loading calendar events..." : "September 2026 · Operations schedule"}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="p-3 lg:col-span-8">
          <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wider text-muted">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            <div />
            {days.map((d) => {
              const date = `2026-09-${String(d).padStart(2, "0")}`;
              const items = events.filter((e) => e.date === date);
              const isToday = d === 11;
              return (
                <div
                  key={d}
                  className={cn(
                    "min-h-20 rounded-md border border-border p-1.5 text-xs",
                    isToday && "border-accent bg-accent-soft/40",
                  )}
                >
                  <div className={cn("font-mono font-semibold", isToday && "text-accent")}>{d}</div>
                  {items.map((e) => (
                    <div
                      key={e.id}
                      className={cn("mt-0.5 truncate rounded px-1 py-0.5 text-[10px]", kindColor[e.kind] || "bg-surface-2 text-ink")}
                    >
                      {e.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4 lg:col-span-4">
          <h2 className="mb-3 font-display text-sm font-semibold">Upcoming events</h2>
          {isLoading ? (
            <div className="flex min-h-[150px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-accent" />
            </div>
          ) : events.length === 0 ? (
            <p className="text-xs text-muted">No upcoming events scheduled.</p>
          ) : (
            <div className="space-y-2">
              {events.slice(0, 8).map((e) => (
                <div key={e.id} className="rounded-lg bg-surface-2 p-3">
                  <div className="text-sm font-semibold">{e.title}</div>
                  <div className="font-mono text-[11px] text-muted">
                    {e.date} · {e.time} · {e.place}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
