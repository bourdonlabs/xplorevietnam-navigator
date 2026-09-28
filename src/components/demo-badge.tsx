"use client";
import { backend } from "@/lib/backend";

export function DemoBadge() {
  if (!backend.demo) return null;
  return (
    <div className="pointer-events-none fixed bottom-3 left-3 z-[60] whitespace-nowrap rounded-full bg-brand-gold px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-navy shadow">
      Demo mode
    </div>
  );
}
