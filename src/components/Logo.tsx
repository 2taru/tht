import { useId } from "react";
import { cn } from "@/lib/utils";

/** Знак-монограма: годинник, де літера «t» утворена стрілкою на 12 + перекладиною. */
export function LogoMark({ className }: { className?: string }) {
  const gid = useId();
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label="tht"
      className={className}
    >
      <defs>
        <linearGradient
          id={gid}
          x1="8"
          y1="6"
          x2="56"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${gid})`} />
      <circle
        cx="32"
        cy="33"
        r="18"
        stroke="#fff"
        strokeOpacity="0.3"
        strokeWidth="2.5"
      />
      <g
        stroke="#fff"
        strokeOpacity="0.55"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M32 17.5v3" />
        <path d="M47.5 33h-3" />
        <path d="M32 48.5v-3" />
        <path d="M16.5 33h3" />
      </g>
      <g stroke="#fff" strokeWidth="5" strokeLinecap="round">
        <path d="M32 21.5V43" />
        <path d="M24 28h16" />
      </g>
    </svg>
  );
}

/** Повний логотип: знак + слово «tht». */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className="size-7" />
      <span className="text-lg font-semibold tracking-tight">tht</span>
    </span>
  );
}
