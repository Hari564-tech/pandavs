import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon,
  tone,
  onClick,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: ReactNode;
  tone?: "default" | "danger" | "warn";
  onClick?: () => void;
}) {
  return (
    <Card
      className={cn(
        "flex flex-col justify-between p-4 transition-shadow hover:shadow-md",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</span>
        {icon ? (
          <span
            className={cn(
              "rounded-md p-1",
              tone === "danger" ? "bg-danger-soft text-danger" : "bg-surface-2 text-accent",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div
        className={cn(
          "font-display text-3xl font-bold tabular tracking-tight",
          tone === "danger" && "text-danger",
          tone === "warn" && "text-warn",
        )}
      >
        {value}
      </div>
      {hint ? <div className="mt-2 text-xs text-muted">{hint}</div> : null}
    </Card>
  );
}
