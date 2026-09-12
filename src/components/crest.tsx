import { cn } from "@/lib/utils";

export function Crest({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-9 w-9 shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="#1C2541" />
      <path d="M6 11 L16 6 L26 11 L16 8.2 Z" fill="#D97706" />
      <text
        x="16"
        y="23"
        textAnchor="middle"
        fill="#F4F6FB"
        fontFamily="ui-sans-serif, system-ui"
        fontSize="11"
        fontWeight="700"
      >
        TH
      </text>
    </svg>
  );
}
