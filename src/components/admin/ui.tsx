"use client";
import { createContext, useContext } from "react";
import type { User } from "@/lib/backend";
import { REQUEST_STATUSES, STAGES, type AdminClient, type StaffMember } from "@/lib/admin";
import { MOVE_STAGES, VISA_TYPES } from "@/lib/journey";
import { SERVICE_CATALOG, type ServiceKey } from "@/lib/services";
import { cn } from "@/lib/utils";

// ───────── Context shared by every admin page ─────────
export type AdminCtxValue = { user: User; staff: StaffMember[] };
export const AdminCtx = createContext<AdminCtxValue | null>(null);
export const useAdmin = () => useContext(AdminCtx)!;

// ───────── Labels & formatting ─────────
export const visaLabel = (v: string | null | undefined) => VISA_TYPES.find((x) => x.value === v)?.label || "—";
export const moveStageLabel = (v: string | null | undefined) =>
  ({ researching: "Researching", planning: "Planning (12+ mo)", moving_soon: "Moving within 12 mo", moved: "Already in Vietnam" })[v || ""] ||
  MOVE_STAGES.find((x) => x.value === v)?.label ||
  "—";
export const serviceName = (s: string) => SERVICE_CATALOG[s as ServiceKey]?.name || s;
export const clientName = (c: Pick<AdminClient, "first_name" | "last_name" | "email">) =>
  [c.first_name, c.last_name].filter(Boolean).join(" ") || c.email || "Unnamed";
export const usd = (n: number) => "$" + n.toLocaleString("en-US");

export const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
export function timeAgo(iso: string | null | undefined) {
  if (!iso) return "—";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 30) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(iso);
}
export function daysUntil(date: string | null | undefined) {
  if (!date) return null;
  return Math.round((new Date(date + "T00:00:00").getTime() - Date.now()) / 86400000);
}

// ───────── Small building blocks ─────────
export function Pill({ tone, children, className }: { tone: string; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", tone, className)}>
      {children}
    </span>
  );
}
export const StagePill = ({ stage }: { stage: string }) => {
  const s = STAGES.find((x) => x.value === stage) || STAGES[0];
  return <Pill tone={s.tone}>{s.label}</Pill>;
};
export const StatusPill = ({ status }: { status: string }) => {
  const s = REQUEST_STATUSES.find((x) => x.value === status) || REQUEST_STATUSES[0];
  return <Pill tone={s.tone}>{s.label}</Pill>;
};

export function Panel({ title, action, children, className, bodyClass }: { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClass?: string }) {
  return (
    <section className={cn("rounded-xl border border-gray-200 bg-white shadow-sm", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-brand-navy">{title}</h2>
          {action}
        </div>
      )}
      <div className={cn("p-5", bodyClass)}>{children}</div>
    </section>
  );
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-brand-navy">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-600">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-gray-500">{children}</p>;
}

export function Loading() {
  return (
    <div className="space-y-4">
      <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-white" />
        ))}
      </div>
      <div className="h-72 animate-pulse rounded-xl bg-white" />
    </div>
  );
}

export const selectCls =
  "h-9 rounded-md border border-gray-200 bg-white px-2.5 pr-8 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-primary/30";

/** Downloads rows as a CSV file (opens cleanly in Excel and Google Sheets). */
export function downloadCsv(filename: string, rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const blob = new Blob(["﻿" + rows.map((r) => r.map(esc).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
