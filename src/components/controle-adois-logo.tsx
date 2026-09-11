import { useId } from "react";
import { cn } from "@/lib/utils";

export function ControleADoisMark({ className }: { className?: string }) {
  const gradientId = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      className={cn("h-6 w-6", className)}
    >
      <defs>
        <linearGradient id={gradientId} x1="5" y1="4" x2="27" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C7D2FE" />
          <stop offset="0.52" stopColor="#A5B4FC" />
          <stop offset="1" stopColor="#67E8F9" />
        </linearGradient>
      </defs>
      <rect x="4.5" y="5" width="15" height="18" rx="4" stroke={`url(#${gradientId})`} strokeWidth="2.4" opacity="0.55" />
      <rect x="11.5" y="9" width="16" height="18" rx="4" fill="#111827" stroke={`url(#${gradientId})`} strokeWidth="2.4" />
      <path d="M15.5 21.5v-3.2M19.5 21.5v-6.7M23.5 21.5v-9.2" stroke={`url(#${gradientId})`} strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function ControleADoisLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-400/25 bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-950/40">
        <ControleADoisMark />
      </span>
      <span className="whitespace-nowrap text-lg font-extrabold tracking-tight text-white">
        Controle <span className="text-indigo-300">A Dois</span>
      </span>
    </span>
  );
}
