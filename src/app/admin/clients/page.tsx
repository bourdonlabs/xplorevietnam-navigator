"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FileText, ListChecks, Search } from "lucide-react";
import { Avatar } from "@/components/avatar";
import {
  Empty, Loading, PageHeader, StagePill, clientName, downloadCsv, fmtDate, moveStageLabel, selectCls, serviceName, timeAgo, useAdmin, visaLabel,
} from "@/components/admin/ui";
import { OPEN_STATUSES, PAID_STATUSES, STAGES, admin, type AdminClient } from "@/lib/admin";
import { VISA_TYPES } from "@/lib/journey";
import { CITIES } from "@/lib/visa-docs";
import { cn } from "@/lib/utils";

const PAGE = 25;
type Sort = "newest" | "oldest" | "name" | "move" | "active";

export default function ClientsPage() {
  const router = useRouter();
  const { staff } = useAdmin();
  const [clients, setClients] = useState<AdminClient[] | null>(null);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("");
  const [visa, setVisa] = useState("");
  const [city, setCity] = useState("");
  const [onb, setOnb] = useState("");
  const [reqs, setReqs] = useState("");
  const [owner, setOwner] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [page, setPage] = useState(0);

  useEffect(() => {
    admin.listClients().then(setClients);
  }, []);

  const rows = useMemo(() => {
    if (!clients) return [];
    const t = q.trim().toLowerCase();
    const out = clients.filter((c) => {
      if (t && ![clientName(c), c.email, c.nationality, c.destination_city].some((v) => v?.toLowerCase().includes(t))) return false;
      if (stage && c.stage !== stage) return false;
      if (visa && c.visa_type !== visa) return false;
      if (city && c.destination_city !== city) return false;
      if (onb === "done" && !c.onboarded_at) return false;
      if (onb === "not" && c.onboarded_at) return false;
      if (reqs === "any" && !c.requests.length) return false;
      if (reqs === "open" && !c.requests.some((r) => OPEN_STATUSES.includes(r.status))) return false;
      if (reqs === "paid" && !c.requests.some((r) => PAID_STATUSES.includes(r.status))) return false;
      if (reqs === "none" && c.requests.length) return false;
      if (owner === "none" && c.assigned_to) return false;
      if (owner && owner !== "none" && c.assigned_to !== owner) return false;
      return true;
    });
    const by: Record<Sort, (a: AdminClient, b: AdminClient) => number> = {
      newest: (a, b) => b.created_at.localeCompare(a.created_at),
      oldest: (a, b) => a.created_at.localeCompare(b.created_at),
      name: (a, b) => clientName(a).localeCompare(clientName(b)),
      move: (a, b) => (a.anticipated_move_date || "9999").localeCompare(b.anticipated_move_date || "9999"),
      active: (a, b) => (b.last_sign_in_at || "").localeCompare(a.last_sign_in_at || ""),
    };
    return out.sort(by[sort]);
  }, [clients, q, stage, visa, city, onb, reqs, owner, sort]);

  if (!clients) return <Loading />;
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const p = Math.min(page, pages - 1);
  const shown = rows.slice(p * PAGE, p * PAGE + PAGE);
  const filtered = !!(q || stage || visa || city || onb || reqs || owner);
  const reset = () => {
    setQ(""); setStage(""); setVisa(""); setCity(""); setOnb(""); setReqs(""); setOwner(""); setPage(0);
  };
  const on = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(0);
  };

  const exportCsv = () =>
    downloadCsv(`xplorevietnam-clients-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["First name", "Last name", "Email", "Signed up", "Onboarded", "Email confirmed", "Last sign-in", "Nationality", "Country of residence",
        "Visa route", "Destination city", "Move stage", "Move date", "Sponsor", "Pipeline stage", "Owner", "Documents uploaded",
        "Checklist items done", "Dependents", "Requests"],
      ...rows.map((c) => [
        c.first_name, c.last_name, c.email, c.created_at.slice(0, 10), c.onboarded_at?.slice(0, 10), c.email_confirmed_at ? "yes" : "no",
        c.last_sign_in_at?.slice(0, 10), c.nationality, c.country_of_residence, visaLabel(c.visa_type), c.destination_city,
        moveStageLabel(c.move_stage), c.anticipated_move_date, c.has_sponsor ? c.sponsor_type || "yes" : "no",
        STAGES.find((s) => s.value === c.stage)?.label, staff.find((s) => s.user_id === c.assigned_to)?.full_name, c.docs, c.checklist,
        c.dependents, c.requests.map((r) => `${serviceName(r.service)} (${r.status})`).join("; "),
      ]),
    ]);

  return (
    <>
      <PageHeader
        title="Clients"
        subtitle={`${clients.length} ${clients.length === 1 ? "person has" : "people have"} signed up to Navigator`}
        action={
          <button
            onClick={exportCsv}
            disabled={!rows.length}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3.5 text-sm font-medium text-brand-navy hover:bg-gray-50 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Export {filtered ? `${rows.length} ` : ""}to CSV
          </button>
        }
      />

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={q}
              onChange={(e) => on(setQ)(e.target.value)}
              placeholder="Search name, email, nationality or city"
              className="h-9 w-full rounded-md border border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <Filter label="Stage" value={stage} onChange={on(setStage)} options={STAGES.map((s) => [s.value, s.label])} />
          <Filter label="Visa" value={visa} onChange={on(setVisa)} options={VISA_TYPES.map((v) => [v.value, v.label])} />
          <Filter label="City" value={city} onChange={on(setCity)} options={CITIES.map((c) => [c, c])} />
          <Filter label="Onboarding" value={onb} onChange={on(setOnb)} options={[["done", "Finished"], ["not", "Not finished"]]} />
          <Filter label="Requests" value={reqs} onChange={on(setReqs)} options={[["any", "Any request"], ["open", "Open request"], ["paid", "Has paid"], ["none", "No requests"]]} />
          {staff.length > 1 && (
            <Filter label="Owner" value={owner} onChange={on(setOwner)} options={[["none", "Unassigned"], ...staff.map((s) => [s.user_id, s.full_name] as [string, string])]} />
          )}
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={selectCls} aria-label="Sort">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="name">Name A–Z</option>
            <option value="move">Move date (soonest)</option>
            <option value="active">Recently active</option>
          </select>
          {filtered && (
            <button onClick={reset} className="px-2 text-sm text-primary hover:underline">
              Clear
            </button>
          )}
        </div>

        {rows.length === 0 ? (
          <Empty>{clients.length ? "No clients match these filters." : "No one has signed up yet."}</Empty>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Client</th>
                    <th className="px-3 py-2.5 font-medium">Visa · City</th>
                    <th className="px-3 py-2.5 font-medium">Move date</th>
                    <th className="px-3 py-2.5 font-medium">Stage</th>
                    <th className="px-3 py-2.5 font-medium">Activity</th>
                    <th className="px-3 py-2.5 font-medium">Signed up</th>
                    <th className="px-4 py-2.5 font-medium">Last active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {shown.map((c) => {
                    const open = c.requests.filter((r) => OPEN_STATUSES.includes(r.status)).length;
                    return (
                      <tr key={c.user_id} onClick={() => router.push(`/admin/clients/${c.user_id}`)} className="cursor-pointer hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <Link href={`/admin/clients/${c.user_id}`} className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                            <Avatar profile={c} email={c.email || ""} className="h-9 w-9 text-xs" />
                            <div className="min-w-0">
                              <p className="truncate font-medium text-brand-navy">{clientName(c)}</p>
                              <p className="truncate text-xs text-gray-500">{c.email}</p>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-3">
                          {c.onboarded_at ? (
                            <>
                              <p className="whitespace-nowrap text-brand-navy">{visaLabel(c.visa_type)}</p>
                              <p className="whitespace-nowrap text-xs text-gray-500">{c.destination_city || "—"}</p>
                            </>
                          ) : (
                            <span className="text-xs text-amber-700">Not onboarded</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-brand-navy">{fmtDate(c.anticipated_move_date)}</td>
                        <td className="px-3 py-3">
                          <StagePill stage={c.stage} />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-3 whitespace-nowrap text-xs text-gray-600">
                            <span className="flex items-center gap-1" title="Visa documents uploaded">
                              <FileText className="h-3.5 w-3.5 text-gray-400" /> {c.docs}
                            </span>
                            <span className="flex items-center gap-1" title="Pre-arrival checklist items done">
                              <ListChecks className="h-3.5 w-3.5 text-gray-400" /> {c.checklist}
                            </span>
                            {open > 0 && (
                              <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
                                {open} open
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-gray-600">{fmtDate(c.created_at)}</td>
                        <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                          {c.email_confirmed_at ? timeAgo(c.last_sign_in_at) : <span className="text-xs text-amber-700">Email unconfirmed</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <ul className="divide-y divide-gray-100 md:hidden">
              {shown.map((c) => (
                <li key={c.user_id}>
                  <Link href={`/admin/clients/${c.user_id}`} className="flex items-start gap-3 p-4">
                    <Avatar profile={c} email={c.email || ""} className="h-10 w-10 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-medium text-brand-navy">{clientName(c)}</p>
                        <StagePill stage={c.stage} />
                      </div>
                      <p className="truncate text-xs text-gray-500">{c.email}</p>
                      <p className="mt-1 text-xs text-gray-600">
                        {c.onboarded_at ? `${visaLabel(c.visa_type)} · ${c.destination_city || "—"} · moves ${fmtDate(c.anticipated_move_date)}` : "Not onboarded"}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">Signed up {timeAgo(c.created_at)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
              <span>
                {p * PAGE + 1}–{Math.min(rows.length, (p + 1) * PAGE)} of {rows.length}
              </span>
              <div className="flex gap-2">
                <button disabled={p === 0} onClick={() => setPage(p - 1)} className={cn(pagerBtn)}>
                  Previous
                </button>
                <button disabled={p >= pages - 1} onClick={() => setPage(p + 1)} className={cn(pagerBtn)}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

const pagerBtn = "h-8 rounded-md border border-gray-200 px-3 text-sm text-brand-navy hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40";

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
      className={cn(selectCls, value && "border-primary/50 bg-brand-tint font-medium")}
    >
      <option value="">{label}: all</option>
      {options.map(([v, l]) => (
        <option key={v} value={v}>
          {l}
        </option>
      ))}
    </select>
  );
}
