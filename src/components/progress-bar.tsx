import { cn } from "@/lib/utils";

export function ProgressBar({
  value,
  tone = "accent",
  className,
}: {
  value: number;
  tone?: "accent" | "success" | "warn" | "danger" | "muted";
  className?: string;
}) {
  const color =
    tone === "success"
      ? "bg-success"
      : tone === "warn"
        ? "bg-warn"
        : tone === "danger"
          ? "bg-danger"
          : tone === "muted"
            ? "bg-subtle"
            : "bg-accent";
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className={cn("h-full rounded-full transition-[width] duration-300", color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

export function progressTone(value: number, status?: string) {
  if (status === "delayed" || status === "blocked") return "danger" as const;
  if (status === "at_risk") return "warn" as const;
  if (value >= 80) return "success" as const;
  if (value < 40) return "muted" as const;
  return "accent" as const;
}
