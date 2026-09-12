import type { VariantProps } from "class-variance-authority";
import { Badge, badgeVariants } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

const map: Record<string, { variant: BadgeVariant; label: string }> = {
  healthy: { variant: "success", label: "Healthy" },
  at_risk: { variant: "warn", label: "At risk" },
  delayed: { variant: "danger", label: "Delayed" },
  planning: { variant: "default", label: "Planning" },
  high: { variant: "danger", label: "High" },
  medium: { variant: "gold", label: "Medium" },
  low: { variant: "default", label: "Low" },
  todo: { variant: "default", label: "To do" },
  in_progress: { variant: "accent", label: "In progress" },
  blocked: { variant: "danger", label: "Blocked" },
  review: { variant: "warn", label: "In review" },
  done: { variant: "success", label: "Done" },
  draft: { variant: "default", label: "Draft" },
  submitted: { variant: "accent", label: "Submitted" },
  approved: { variant: "success", label: "Approved" },
  revision: { variant: "warn", label: "Revision" },
  active: { variant: "success", label: "Active" },
  offline: { variant: "default", label: "Offline" },
  super_admin: { variant: "gold", label: "Super admin" },
  faculty: { variant: "accent", label: "Faculty" },
  lead: { variant: "navy", label: "Lead" },
  member: { variant: "default", label: "Member" },
};

export function StatusBadge({
  value,
  className,
  pulse,
}: {
  value: string;
  className?: string;
  pulse?: boolean;
}) {
  const item = map[value] ?? { variant: "default" as const, label: value.replace(/_/g, " ") };
  return (
    <Badge variant={item.variant} className={cn("normal-case tracking-wide", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full bg-current", pulse && "animate-pulse")} />
      {item.label}
    </Badge>
  );
}
