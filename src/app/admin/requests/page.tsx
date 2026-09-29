"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Download } from "lucide-react";
import { RequestRow } from "@/components/admin/requests";
import { Empty, Loading, PageHeader, clientName, downloadCsv, serviceName, usd } from "@/components/admin/ui";
import { OPEN_STATUSES, REQUEST_STATUSES, admin, type AdminClient, type AdminRequest } from "@/lib/admin";
import { cn } from "@/lib/utils";

type Tab = "open" | "all" | AdminRequest["status"];

export default function RequestsPage() {
  const [clients, setClients] = useState<AdminClient[] | null>(null);
  const [tab, setTab] = useState<Tab>("open");
  const load = useCallback(() => admin.listClients().then(setClients), []);
  useEffect(() => {
    load();
  }, [load]);

  const all = useMemo(
    () => (clients || []).flatMap((c) => c.requests.map((r) => ({ r, c }))).sort((a, b) => b.r.created_at.localeCompare(a.r.created_at)),
    [clients],
  );
  if (!clients) return <Loading />;

  const match = (t: Tab, r: AdminRequest) => (t === "all" ? true : t === "open" ? OPEN_STATUSES.includes(r.status) : r.status === t);
  const tabs: { key: Tab; label: string }[] = [
    { key: "open", label: "Open" },
    ...REQUEST_STATUSES.map((s) => ({ key: s.value as Tab, label: s.label })),
    { key: "all", label: "All" },
  ];
  const shown = all.filter(({ r }) => match(tab, r));
  // Open requests read oldest first (the queue); everything else newest first.
  if (tab === "open") shown.reverse();

  const exportCsv = () =>
    downloadCsv(`xplorevietnam-requests-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Requested", "Client", "Email", "Service", "Amount (USD)", "Dependents", "Status", "Paid by card", "Note"],
      ...shown.map(({ r, c }) => [
        r.created_at.slice(0, 16).replace("T", " "), clientName(c), c.email, serviceName(r.service), r.amount_usd, r.dependents,
        REQUEST_STATUSES.find((s) => s.value === r.status)?.label, r.stripe_session_id ? "yes" : "no", r.note,
      ]),
    ]);

  return (
    <>
      <PageHeader
        title="Service requests"
        subtitle="Tax codes, bank accounts and visa reviews requested from Navigator. Change the status as the work moves along."
        action={
          <button
            onClick={exportCsv}
            disabled={!shown.length}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3.5 text-sm font-medium text-brand-navy hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 pt-2">
          {tabs.map((t) => {
            const n = all.filter(({ r }) => match(t.key, r)).length;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm",
                  tab === t.key ? "border-primary font-medium text-primary" : "border-transparent text-gray-600 hover:text-brand-navy",
                )}
              >
                {t.label}
                <span className={cn("rounded-full px-1.5 text-xs", tab === t.key ? "bg-brand-tint" : "bg-gray-100")}>{n}</span>
              </button>
            );
          })}
        </div>
        {shown.length === 0 ? (
          <Empty>{tab === "open" ? "Nothing waiting. You're all caught up." : "No requests here."}</Empty>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {shown.map(({ r, c }) => (
                <RequestRow
                  key={r.id}
                  r={r}
                  onChange={load}
                  client={
                    <Link href={`/admin/clients/${c.user_id}`} className="text-sm text-primary hover:underline">
                      {clientName(c)}
                    </Link>
                  }
                />
              ))}
            </ul>
            <div className="border-t border-gray-100 px-5 py-3 text-sm text-gray-600">
              {shown.length} request{shown.length === 1 ? "" : "s"} · {usd(shown.reduce((s, x) => s + x.r.amount_usd, 0))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
