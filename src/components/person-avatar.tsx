import { cn, hashHue } from "@/lib/utils";
import type { Person, Presence } from "@/lib/types";

const presenceDot: Record<Presence, string> = {
  active: "bg-success",
  review: "bg-warn",
  offline: "bg-subtle",
};

export function PersonAvatar({
  person,
  size = "md",
  showPresence = false,
}: {
  person: Person;
  size?: "xs" | "sm" | "md" | "lg";
  showPresence?: boolean;
}) {
  const hue = hashHue(person.id);
  const dim =
    size === "xs"
      ? "h-5 w-5 text-[9px]"
      : size === "sm"
        ? "h-7 w-7 text-[10px]"
        : size === "lg"
          ? "h-14 w-14 text-lg"
          : "h-8 w-8 text-xs";
  return (
    <span className="relative inline-flex shrink-0">
      {person.avatar_url ? (
        <img
          src={person.avatar_url}
          alt={person.name}
          className={cn("rounded-full object-cover border border-border/50", dim)}
        />
      ) : (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full font-semibold text-navy-fg",
            dim,
          )}
          style={{ background: `hsl(${hue} 32% 32%)` }}
          title={person.name}
        >
          {person.short}
        </span>
      )}
      {showPresence ? (
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface",
            presenceDot[person.presence],
          )}
        />
      ) : null}
    </span>
  );
}
