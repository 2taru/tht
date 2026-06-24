import { useId } from "react";
import { cn } from "@/lib/utils";

/** Літерний знак «tht» у градієнтному бейджі з акцентом-«таймлайном». */
export function LogoMark({ className }: { className?: string }) {
  const gid = useId();
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label="tht" className={className}>
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
      <text
        x="32"
        y="43"
        textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
        fontSize="30"
        fontWeight="700"
        letterSpacing="-1.5"
        fill="#fff"
      >
        tht
      </text>
      <rect
        x="17"
        y="47.5"
        width="30"
        height="3"
        rx="1.5"
        fill="#fff"
        fillOpacity="0.5"
      />
    </svg>
  );
}

/** Логотип для шапок: знак у читабельному розмірі. */
export function Logo({ className }: { className?: string }) {
  return <LogoMark className={cn("size-8", className)} />;
}
