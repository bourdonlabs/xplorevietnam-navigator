"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Empty, Loading, PageHeader, Pill, downloadCsv, fmtDate, selectCls } from "@/components/admin/ui";
import {
  PROGRAMS, STATE_META, commissionState, partnerAdmin, partnerProgram,
  type AdminCommission, type AdminPartner, type CommissionState, type Program, type PartnerStatus,
} from "@/lib/partner-program";
import { cn } from "@/lib/utils";

const money = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${Math.round(n * 10000) / 100}%`;
const inputCls = "h-9 rounded-md border border-gray-200 bg-white px-2.5 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-primary/30";
const btn = "inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3.5 text-sm font-medium text-brand-navy hover:bg-gray-50 disabled:opacity-50";
const btnPrimary = "inline-flex h-9 items-center gap-2 rounded-md bg-primary px-3.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50";

type Tab = "applications" | "payouts" | "commissions" | "partners";
type Filter = "all" | CommissionState;

export default function PartnersAdminPage() {
  const [partners, setPartners] = useState<AdminPartner[] | null>(null);
  const [commissions, setCommissions] = useState<AdminCommission[] | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab | null>(null);

  const load = useCallback(
    () =>
      Promise.all([partnerAdmin.listPartners(), partnerAdmin.listCommissions()])
        .then(([p, c]) => {
          setPartners(p);
          setCommissions(c);
        })
        .catch((e) => setError(e instanceof Error ? e.message : "Could not load partners.")),
    [],
  );
  useEffect(() => {
    if (partnerProgram.available) load();
  }, [load]);

  if (!partnerProgram.available) return <p className="text-sm text-gray-600">Partners need the live database, so they are not available in demo mode.</p>;
  if (error) return <p className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} If this is the first time, run 0007_partner_program.sql in Supabase first.</p>;
  if (!partners || !commissions) return <Loading />;

  const pendingApps = partners.filter((p) => p.status === "pending");
  const current: Tab = tab ?? (pendingApps.length ? "applications" : "payouts");
  const payable = commissions.filter((c) => commissionState(c) === "payable");
  const owed = payable.reduce((s, c) => s + c.commission_usd, 0);
  const tabs: { key: Tab; label: string; n: number }[] = [
    { key: "applications", label: "Applications", n: pendingApps.length },
    { key: "payouts", label: "Payouts", n: new Set(payable.map((c) => c.partner_id)).size },
    { key: "commissions", label: "Commissions", n: commissions.length },
    { key: "partners", label: "Partners", n: partners.length },
  ];

  return (
    <>
      <PageHeader title="Partners" subtitle={`${partners.length} partner${partners.length === 1 ? "" : "s"} · ${pendingApps.length} to review · ${money(owed)} payable now`} />
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 pt-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm",
                current === t.key ? "border-primary font-medium text-primary" : "border-transparent text-gray-600 hover:text-brand-navy",
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 text-xs", current === t.key ? "bg-brand-tint" : "bg-gray-100")}>{t.n}</span>
            </button>
          ))}
        </div>
        {current === "applications" && <Applications rows={pendingApps} onChange={load} />}
        {current === "payouts" && <Payouts rows={payable} onChange={load} />}
        {current === "commissions" && <Commissions rows={commissions} onChange={load} />}
        {current === "partners" && <PartnerList rows={partners} onChange={load} />}
      </div>
    </>
  );
}

// ───────── Payout run: everything payable now, grouped by partner ─────────
function Payouts({ rows, onChange }: { rows: AdminCommission[]; onChange: () => void }) {
  const groups = useMemo(() => {
    const m = new Map<string, AdminCommission[]>();
    rows.forEach((c) => m.set(c.partner_id, [...(m.get(c.partner_id) || []), c]));
    return [...m.values()];
  }, [rows]);
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const dest = (c: AdminCommission) => (c.partner?.payout_method === "bank" ? c.partner?.bank_details : c.partner?.paypal_email) || "";
  const exportCsv = () =>
    downloadCsv(`xplorevietnam-payouts-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Partner", "Code", "Name", "Email", "Pay by", "Pay to", "Sales", "Amount (USD)"],
      ...groups.map((g) => [
        g[0].partner?.username, g[0].partner?.code, g[0].partner?.name, g[0].partner?.email,
        g[0].partner?.payout_method === "bank" ? "Bank transfer" : "PayPal", dest(g[0]), g.length,
        g.reduce((s, c) => s + c.commission_usd, 0).toFixed(2),
      ]),
    ]);

  const markPaid = async (g: AdminCommission[]) => {
    const pid = g[0].partner_id;
    setBusy(pid);
    const ref = (refs[pid] || "").trim() || null;
    const results = await Promise.all(g.map((c) => partnerAdmin.updateCommission(c.id, { status: "paid", paid_at: new Date().toISOString(), payout_ref: ref })));
    setBusy(null);
    const failed = results.find((r) => r.error);
    if (failed) toast.error("Couldn't save: " + failed.error);
    else toast.success("Marked as paid");
    onChange();
  };

  if (!groups.length) return <Empty>Nothing is payable right now. Commissions become payable 30 days after the purchase.</Empty>;
  return (
    <div>
      <div className="flex items-center justify-between gap-3 px-5 py-3 text-sm text-gray-600">
        <span>Pay each partner, then record the PayPal or bank reference and mark it paid.</span>
        <button onClick={exportCsv} className={btn}><Download className="h-4 w-4" /> Export CSV</button>
      </div>
      <ul className="divide-y divide-gray-100 border-t border-gray-100">
        {groups.map((g) => {
          const p = g[0].partner;
          const total = g.reduce((s, c) => s + c.commission_usd, 0);
          const pid = g[0].partner_id;
          return (
            <li key={pid} className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <p className="font-medium text-brand-navy">{p?.name || p?.username} <span className="text-sm font-normal text-gray-500">· {p?.code}</span></p>
                <p className="mt-0.5 text-sm text-gray-600">{p?.payout_method === "bank" ? "Bank transfer" : "PayPal"}</p>
                {dest(g[0]) ? (
                  <p className="mt-1 whitespace-pre-line break-words rounded-md bg-gray-50 p-2 text-sm text-brand-navy">{dest(g[0])}</p>
                ) : (
                  <p className="mt-1 text-sm text-amber-700">No payout details yet. Ask {p?.email || "the partner"} to add them in their dashboard.</p>
                )}
                <p className="mt-1 text-xs text-gray-500">{g.length} sale{g.length === 1 ? "" : "s"}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-xl font-bold tabular-nums text-brand-navy">{money(total)}</p>
                <div className="flex items-center gap-2">
                  <input className={cn(inputCls, "w-44")} placeholder="PayPal / bank reference" value={refs[pid] || ""} onChange={(e) => setRefs({ ...refs, [pid]: e.target.value })} aria-label="Payment reference" />
                  <button className={btnPrimary} disabled={busy === pid} onClick={() => markPaid(g)}>{busy === pid ? "Saving..." : "Mark paid"}</button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ───────── All commissions ─────────
function Commissions({ rows, onChange }: { rows: AdminCommission[]; onChange: () => void }) {
  const [filter, setFilter] = useState<Filter>("all");
  const shown = rows.filter((c) => filter === "all" || commissionState(c) === filter);
  const act = async (id: string, patch: Parameters<typeof partnerAdmin.updateCommission>[1], ok: string) => {
    const r = await partnerAdmin.updateCommission(id, patch);
    if (r.error) toast.error("Couldn't save: " + r.error);
    else toast.success(ok);
    onChange();
  };
  return (
    <div>
      <div className="flex items-center gap-2 px-5 py-3">
        <select className={selectCls} value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filter commissions">
          <option value="all">All</option>
          {(Object.keys(STATE_META) as CommissionState[]).map((k) => <option key={k} value={k}>{STATE_META[k].label}</option>)}
        </select>
      </div>
      {!shown.length ? (
        <Empty>{rows.length ? "No commissions match." : "No commissions yet. They appear when a paid order used a partner code."}</Empty>
      ) : (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {shown.map((c) => {
            const st = commissionState(c);
            return (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill tone={STATE_META[st].tone}>{STATE_META[st].label}</Pill>
                    <span className="font-medium text-brand-navy">{c.partner?.name || c.partner?.username}</span>
                    <span className="text-sm text-gray-500">· {c.partner?.code}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {fmtDate(c.created_at)} · sale {money(c.sale_usd)} at {pct(c.rate)}
                    {st === "pending" && ` · payable ${fmtDate(c.payable_on)}`}
                    {st === "paid" && ` · paid ${fmtDate(c.paid_at)}${c.payout_ref ? ` (${c.payout_ref})` : ""}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-semibold tabular-nums text-brand-navy">{money(c.commission_usd)}</p>
                  {st === "void" ? (
                    <button className={btn} onClick={() => act(c.id, { status: "pending" }, "Commission restored")}>Restore</button>
                  ) : (
                    <>
                      {st !== "paid" && <button className={btn} onClick={() => act(c.id, { status: "paid", paid_at: new Date().toISOString() }, "Marked as paid")}>Mark paid</button>}
                      {st === "paid" && <button className={btn} onClick={() => act(c.id, { status: "pending", paid_at: null, payout_ref: null }, "Reopened")}>Undo paid</button>}
                      <button className={cn(btn, "text-rose-700")} onClick={() => confirm("Void this commission? Use this for refunded orders.") && act(c.id, { status: "void" }, "Commission voided")}>Void</button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// ───────── Applications ─────────
const STATUS_LABEL: Record<PartnerStatus, string> = { pending: "Pending review", active: "Active", suspended: "Suspended", rejected: "Rejected" };
const STATUS_TONE: Record<PartnerStatus, string> = {
  pending: "bg-amber-50 text-amber-800 ring-amber-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  suspended: "bg-rose-50 text-rose-700 ring-rose-200",
  rejected: "bg-gray-100 text-gray-700 ring-gray-200",
};

function Applications({ rows, onChange }: { rows: AdminPartner[]; onChange: () => void }) {
  const [busy, setBusy] = useState("");
  const decide = async (p: AdminPartner, status: PartnerStatus) => {
    setBusy(p.id);
    const res = await partnerAdmin.updatePartner(p.id, { program: p.program, rate: p.commission_rate, discount: p.customer_discount, status });
    setBusy("");
    if (res.error) return toast.error("Couldn't save: " + res.error);
    if (status === "active") {
      // Emails the partner. If email is not set up yet, the admin is told to let them know by hand.
      const sent = await fetch("/api/partners/approved", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ partnerId: p.id }) })
        .then((r) => r.ok)
        .catch(() => false);
      toast.success(sent ? `${p.name || p.username} approved. Their code is live and we emailed them.` : `${p.name || p.username} approved. Their code is live. The email did not send, so let them know yourself.`);
    } else toast.success("Application rejected");
    onChange();
  };
  if (!rows.length) return <Empty>No applications waiting. New partner sign-ups appear here for you to approve or reject.</Empty>;
  return (
    <ul className="divide-y divide-gray-100">
      {rows.map((p) => (
        <li key={p.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="font-medium text-brand-navy">{p.name || p.username}</p>
            <p className="mt-0.5 text-sm text-gray-600">{p.email} · @{p.username} · wants code <code className="font-semibold text-primary">{p.code}</code></p>
            <p className="mt-0.5 text-xs text-gray-500">
              Applied {fmtDate(p.created_at)}
              {p.promote_via ? ` · ${p.promote_via}` : ""}
              {p.content_url && <> · <a href={p.content_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">{p.content_url}</a></>}
              {p.paypal_email ? ` · PayPal ${p.paypal_email}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">On approval: {PROGRAMS.find((x) => x.value === p.program)?.label}, {pct(p.commission_rate)} commission, {pct(p.customer_discount)} off. Change this under the Partners tab first if needed.</p>
          </div>
          <div className="flex gap-2">
            <button className={btnPrimary} disabled={busy === p.id} onClick={() => decide(p, "active")}>Approve</button>
            <button className={cn(btn, "text-rose-700")} disabled={busy === p.id} onClick={() => confirm("Reject this application?") && decide(p, "rejected")}>Reject</button>
          </div>
        </li>
      ))}
    </ul>
  );
}

// ───────── Partners ─────────
function PartnerList({ rows, onChange }: { rows: AdminPartner[]; onChange: () => void }) {
  const [q, setQ] = useState("");
  const shown = rows.filter((p) => !q || [p.username, p.code, p.name, p.email].some((x) => (x || "").toLowerCase().includes(q.toLowerCase())));
  return (
    <div>
      <div className="px-5 py-3">
        <input className={cn(inputCls, "w-full sm:w-72")} placeholder="Search name, email, code..." value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search partners" />
      </div>
      {!shown.length ? (
        <Empty>{rows.length ? "No partners match." : "No partners yet. They appear here after registering on the website."}</Empty>
      ) : (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {shown.map((p) => <PartnerRow key={p.id} p={p} onChange={onChange} />)}
        </ul>
      )}
    </div>
  );
}

function PartnerRow({ p, onChange }: { p: AdminPartner; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const [program, setProgram] = useState<Program>(p.program);
  const [rate, setRate] = useState(String(p.commission_rate * 100));
  const [disc, setDisc] = useState(String(p.customer_discount * 100));
  const [status, setStatus] = useState<PartnerStatus>(p.status);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const r = Number(rate), d = Number(disc);
    if (!(r >= 0 && r <= 50) || !(d >= 0 && d <= 50)) return toast.error("Rates must be between 0 and 50%.");
    setBusy(true);
    const res = await partnerAdmin.updatePartner(p.id, { program, rate: r / 100, discount: d / 100, status });
    setBusy(false);
    if (res.error) return toast.error("Couldn't save: " + res.error);
    toast.success("Partner updated");
    setOpen(false);
    onChange();
  };

  return (
    <li className="px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-brand-navy">{p.name || p.username}</p>
            <Pill tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Pill>
            <Pill tone="bg-gray-100 text-gray-700 ring-gray-200">{PROGRAMS.find((x) => x.value === p.program)?.label}</Pill>
          </div>
          <p className="mt-0.5 text-sm text-gray-600">
            <code className="font-semibold text-primary">{p.code}</code> · @{p.username} · {p.email}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            {pct(p.commission_rate)} commission · {pct(p.customer_discount)} off · joined {fmtDate(p.created_at)}
            {p.promote_via ? ` · ${p.promote_via}` : ""}
            {p.content_url && <> · <a href={p.content_url} target="_blank" rel="noreferrer" className="text-primary hover:underline">content</a></>}
          </p>
        </div>
        <div className="flex items-center gap-5 text-right text-sm tabular-nums">
          <div><p className="text-xs text-gray-500">Clicks</p><p className="font-medium text-brand-navy">{p.summary.visits}</p></div>
          <div><p className="text-xs text-gray-500">Sales</p><p className="font-medium text-brand-navy">{p.summary.sales}</p></div>
          <div><p className="text-xs text-gray-500">Payable</p><p className="font-medium text-primary">{money(p.summary.payable_usd)}</p></div>
          <div><p className="text-xs text-gray-500">Paid</p><p className="font-medium text-brand-navy">{money(p.summary.paid_usd)}</p></div>
          <button className={btn} onClick={() => setOpen(!open)}>{open ? "Close" : "Edit"}</button>
        </div>
      </div>
      {open && (
        <div className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-gray-50 p-3">
          <label className="text-xs text-gray-600">Program
            <select className={cn(selectCls, "mt-1 block")} value={program} onChange={(e) => { const v = e.target.value as Program; setProgram(v); setRate(v === "affiliate" ? "10" : "5"); }}>
              {PROGRAMS.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
            </select>
          </label>
          <label className="text-xs text-gray-600">Commission %
            <input className={cn(inputCls, "mt-1 block w-24")} type="number" min={0} max={50} step={0.5} value={rate} onChange={(e) => setRate(e.target.value)} />
          </label>
          <label className="text-xs text-gray-600">Customer discount %
            <input className={cn(inputCls, "mt-1 block w-24")} type="number" min={0} max={50} step={0.5} value={disc} onChange={(e) => setDisc(e.target.value)} />
          </label>
          <label className="text-xs text-gray-600">Status
            <select className={cn(selectCls, "mt-1 block")} value={status} onChange={(e) => setStatus(e.target.value as PartnerStatus)}>
              <option value="pending">Pending review</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="rejected">Rejected</option>
            </select>
          </label>
          <button className={btnPrimary} disabled={busy} onClick={save}>{busy ? "Saving..." : "Save"}</button>
          <p className="text-xs text-gray-500">Rate changes apply to future sales only. Past commissions keep the rate they were earned at.</p>
        </div>
      )}
    </li>
  );
}
