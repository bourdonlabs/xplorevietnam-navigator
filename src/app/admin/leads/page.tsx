"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, Mail, MessageCircle, Search, Trash2 } from "lucide-react";
import { Empty, Loading, PageHeader, Pill, downloadCsv, fmtDateTime, selectCls, timeAgo, usd } from "@/components/admin/ui";
import { admin } from "@/lib/admin";
import { LEAD_KINDS, LEAD_STATUSES, web, type Lead, type LeadKind, type LeadStatus } from "@/lib/admin-web";
import { cn } from "@/lib/utils";

const kindOf = (k: string) => LEAD_KINDS.find((x) => x.value === k) || LEAD_KINDS[2];
const waLink = (phone: string) => {
  const d = phone.replace(/[^\d]/g, "");
  return d.length >= 8 ? `https://wa.me/${d}` : null;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [clients, setClients] = useState<Map<string, string>>(new Map());
  const [kind, setKind] = useState<"" | LeadKind>("");
  const [status, setStatus] = useState<"" | LeadStatus>("new");
  const [q, setQ] = useState("");

  const load = useCallback(() => web.listLeads().then(setLeads), []);
  useEffect(() => {
    load();
    // Link a lead to their Navigator account when the email matches.
    admin.listClients().then((cs) => setClients(new Map(cs.filter((c) => c.email).map((c) => [c.email!.toLowerCase(), c.user_id]))));
  }, [load]);

  const shown = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (leads || []).filter(
      (l) =>
        (!kind || l.kind === kind) &&
        (!status || l.status === status) &&
        (!t || [l.name, l.email, l.phone, l.message].some((v) => v?.toLowerCase().includes(t))),
    );
  }, [leads, kind, status, q]);

  if (!leads) return <Loading />;
  const count = (k: string) => leads.filter((l) => (!k || l.kind === k) && (!status || l.status === status)).length;

  const exportCsv = () =>
    downloadCsv(`xplorevietnam-leads-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Received", "Type", "Status", "Name", "Email", "Phone", "Message", "Details", "Page", "Note"],
      ...shown.map((l) => [
        l.created_at.slice(0, 16).replace("T", " "), kindOf(l.kind).label, l.status, l.name, l.email, l.phone, l.message,
        detailsText(l), l.page, l.note,
      ]),
    ]);

  return (
    <>
      <PageHeader
        title="Website leads"
        subtitle="Everything sent from xplorevietnam.org: free call requests, messages, quote requests, quiz results and newsletter sign-ups."
        action={
          <button onClick={exportCsv} disabled={!shown.length} className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3.5 text-sm font-medium text-brand-navy hover:bg-gray-50 disabled:opacity-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 pt-2">
          {[{ value: "" as const, label: "All" }, ...LEAD_KINDS].map((k) => (
            <button
              key={k.value}
              onClick={() => setKind(k.value)}
              className={cn(
                "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm",
                kind === k.value ? "border-primary font-medium text-primary" : "border-transparent text-gray-600 hover:text-brand-navy",
              )}
            >
              {k.label}
              <span className={cn("rounded-full px-1.5 text-xs", kind === k.value ? "bg-brand-tint" : "bg-gray-100")}>{count(k.value)}</span>
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, phone or message" className="h-9 w-full rounded-md border border-gray-200 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as LeadStatus | "")} className={selectCls} aria-label="Status">
            <option value="">Any status</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        {shown.length === 0 ? (
          <Empty>{leads.length ? "No leads match these filters." : "No leads yet. Website form submissions will appear here."}</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {shown.map((l) => (
              <LeadRow key={l.id} l={l} clientId={clients.get(l.email.toLowerCase())} onChange={load} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function detailsText(l: Lead) {
  const d = l.data || {};
  const parts: string[] = [];
  if (d.interest) parts.push(`Interested in: ${d.interest}`);
  if (d.preferred_time) parts.push(`Best time: ${d.preferred_time}`);
  if (d.result) parts.push(`Quiz result: ${d.result}`);
  if (Array.isArray(d.items))
    parts.push(
      (d.items as { name: string; dependents?: number; price?: number | null; addons?: string[] }[])
        .map((i) => `${i.name}${i.dependents ? ` + ${i.dependents} dependent(s)` : ""}${i.addons?.length ? ` + ${i.addons.join(", ")}` : ""} (${i.price == null ? "quote" : usd(i.price)})`)
        .join("; "),
    );
  return parts.join(" · ");
}

function LeadRow({ l, clientId, onChange }: { l: Lead; clientId?: string; onChange: () => void }) {
  const [note, setNote] = useState(l.note || "");
  const k = kindOf(l.kind);
  const d = l.data || {};
  const save = async (patch: { status?: LeadStatus; note?: string | null }) => {
    const r = await web.updateLead(l.id, patch);
    if (r.error) toast.error("Couldn't save: " + r.error);
    else {
      toast.success("Saved");
      onChange();
    }
  };
  const remove = async () => {
    if (!confirm("Delete this lead permanently?")) return;
    const r = await web.deleteLead(l.id);
    if (r.error) toast.error(r.error);
    else onChange();
  };
  const wa = l.phone ? waLink(l.phone) : null;
  const items = Array.isArray(d.items) ? (d.items as { name: string; dependents?: number; price?: number | null; addons?: string[]; options?: Record<string, string> }[]) : [];

  return (
    <li className="group space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={k.tone}>{k.label}</Pill>
            <span className="text-xs text-gray-500" title={fmtDateTime(l.created_at)}>
              {timeAgo(l.created_at)}
              {l.page && ` · from ${l.page}`}
            </span>
          </div>
          <p className="mt-2 font-medium text-brand-navy">
            {l.name || l.email}
            {clientId && (
              <Link href={`/admin/clients/${clientId}`} className="ml-2 text-xs font-normal text-primary hover:underline">
                Navigator client →
              </Link>
            )}
          </p>
          <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
              <Mail className="h-3.5 w-3.5" /> {l.email}
            </a>
            {l.phone &&
              (wa ? (
                <a href={wa} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-primary hover:underline">
                  <MessageCircle className="h-3.5 w-3.5" /> {l.phone}
                </a>
              ) : (
                <span className="text-gray-600">{l.phone}</span>
              ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <select value={l.status} onChange={(e) => save({ status: e.target.value as LeadStatus })} className={selectCls} aria-label="Lead status">
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <button onClick={remove} className="rounded-md p-2 text-gray-300 hover:bg-red-50 hover:text-red-600" aria-label="Delete lead">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {Boolean(d.interest || d.preferred_time || d.result) && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {d.interest ? <div><dt className="inline text-gray-500">Needs help with: </dt><dd className="inline text-brand-navy">{String(d.interest)}</dd></div> : null}
          {d.preferred_time ? <div><dt className="inline text-gray-500">Best time: </dt><dd className="inline text-brand-navy">{String(d.preferred_time)}</dd></div> : null}
          {d.result ? <div><dt className="inline text-gray-500">Quiz result: </dt><dd className="inline text-brand-navy">{String(d.result)}</dd></div> : null}
        </dl>
      )}
      {items.length > 0 && (
        <ul className="rounded-lg bg-gray-50 p-3 text-sm">
          {items.map((i, n) => (
            <li key={n} className="flex justify-between gap-4 py-0.5">
              <span className="text-brand-navy">
                {i.name}
                {i.dependents ? ` + ${i.dependents} dependent${i.dependents > 1 ? "s" : ""}` : ""}
                {i.options?.visa_type ? ` · ${i.options.visa_type}` : ""}
                {i.addons?.length ? ` · add-ons: ${i.addons.join(", ")}` : ""}
              </span>
              <span className="whitespace-nowrap text-gray-600">{i.price == null ? "Quote needed" : usd(i.price)}</span>
            </li>
          ))}
        </ul>
      )}
      {l.message && <p className="whitespace-pre-wrap rounded-lg border border-gray-100 p-3 text-sm text-brand-navy">{l.message}</p>}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (l.note || "") && save({ note: note.trim() || null })}
        rows={1}
        placeholder="Internal note (saves when you click away)"
        className="w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </li>
  );
}
