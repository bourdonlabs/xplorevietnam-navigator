"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, ExternalLink, Mail } from "lucide-react";
import { Empty, Loading, PageHeader, Pill, downloadCsv, fmtDateTime, selectCls, timeAgo, usd } from "@/components/admin/ui";
import { ORDER_STATUSES, orderBalance, web, type Order, type OrderStatus } from "@/lib/admin-web";
import { cn } from "@/lib/utils";

type Tab = "open" | "all" | OrderStatus;
const OPEN: OrderStatus[] = ["paid", "in_progress"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [tab, setTab] = useState<Tab>("open");
  const load = useCallback(() => web.listOrders().then(setOrders), []);
  useEffect(() => {
    load();
  }, [load]);

  const match = (t: Tab, o: Order) => (t === "all" ? true : t === "open" ? OPEN.includes(o.status) : o.status === t);
  const shown = useMemo(() => (orders || []).filter((o) => match(tab, o)), [orders, tab]);
  if (!orders) return <Loading />;

  const received = orders.filter((o) => o.status !== "refunded" && o.status !== "cancelled").reduce((s, o) => s + o.amount_total, 0) / 100;
  const tabs: { key: Tab; label: string }[] = [{ key: "open", label: "Open" }, ...ORDER_STATUSES.map((s) => ({ key: s.value as Tab, label: s.label })), { key: "all", label: "All" }];

  const exportCsv = () =>
    downloadCsv(`xplorevietnam-orders-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Date", "Customer", "Email", "Phone", "Country", "Items", "Paid (USD)", "Balance due (USD)", "Status", "Stripe session", "Note"],
      ...shown.map((o) => [
        o.created_at.slice(0, 16).replace("T", " "), o.name, o.email, o.phone, o.address?.country,
        o.items.map((i) => `${i.name}${i.dependents ? ` + ${i.dependents} dep.` : ""}${i.addons.length ? ` + ${i.addons.join(", ")}` : ""}`).join("; "),
        o.amount_total / 100, orderBalance(o), ORDER_STATUSES.find((s) => s.value === o.status)?.label, o.stripe_session_id, o.note,
      ]),
    ]);

  return (
    <>
      <PageHeader
        title="Website orders"
        subtitle={`Packages paid online through the website cart. ${usd(Math.round(received))} received in total.`}
        action={
          <button onClick={exportCsv} disabled={!shown.length} className="inline-flex h-9 items-center gap-2 rounded-md border border-gray-200 bg-white px-3.5 text-sm font-medium text-brand-navy hover:bg-gray-50 disabled:opacity-50">
            <Download className="h-4 w-4" /> Export CSV
          </button>
        }
      />
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-3 pt-2">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm",
                tab === t.key ? "border-primary font-medium text-primary" : "border-transparent text-gray-600 hover:text-brand-navy",
              )}
            >
              {t.label}
              <span className={cn("rounded-full px-1.5 text-xs", tab === t.key ? "bg-brand-tint" : "bg-gray-100")}>{orders.filter((o) => match(t.key, o)).length}</span>
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <Empty>{orders.length ? "No orders here." : "No orders yet. Paid website checkouts will appear here."}</Empty>
        ) : (
          <ul className="divide-y divide-gray-100">
            {shown.map((o) => (
              <OrderRow key={o.id} o={o} onChange={load} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

function OrderRow({ o, onChange }: { o: Order; onChange: () => void }) {
  const [note, setNote] = useState(o.note || "");
  const save = async (patch: { status?: OrderStatus; note?: string | null }) => {
    const r = await web.updateOrder(o.id, patch);
    if (r.error) toast.error("Couldn't save: " + r.error);
    else {
      toast.success("Order updated");
      onChange();
    }
  };
  const balance = orderBalance(o);
  const st = ORDER_STATUSES.find((s) => s.value === o.status) || ORDER_STATUSES[0];
  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone={st.tone}>{st.label}</Pill>
            <span className="text-xs text-gray-500" title={fmtDateTime(o.created_at)}>
              {timeAgo(o.created_at)}
            </span>
          </div>
          <p className="mt-2 font-medium text-brand-navy">{o.name || o.email}</p>
          <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
            {o.email && (
              <a href={`mailto:${o.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <Mail className="h-3.5 w-3.5" /> {o.email}
              </a>
            )}
            {o.phone && <span>{o.phone}</span>}
            {o.address?.country && <span>{[o.address.city, o.address.country].filter(Boolean).join(", ")}</span>}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold tabular-nums text-brand-navy">{usd(Math.round(o.amount_total / 100))} paid</p>
          {balance > 0 && <p className="text-xs text-amber-700">{usd(balance)} balance due after submission</p>}
        </div>
      </div>
      <ul className="rounded-lg bg-gray-50 p-3 text-sm">
        {o.items.map((i, n) => (
          <li key={n} className="flex justify-between gap-4 py-0.5">
            <span className="text-brand-navy">
              {i.name}
              {i.dependents ? ` + ${i.dependents} dependent${i.dependents > 1 ? "s" : ""}` : ""}
              {i.options?.visa_type ? ` · ${i.options.visa_type}` : ""}
              {i.addons.length ? ` · add-ons: ${i.addons.join(", ")}` : ""}
            </span>
            <span className="whitespace-nowrap text-gray-600">{i.price_usd == null ? "" : usd(i.price_usd)}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-3">
        <select value={o.status} onChange={(e) => save({ status: e.target.value as OrderStatus })} className={selectCls} aria-label="Order status">
          {ORDER_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <a
          href={`https://dashboard.stripe.com/search?query=${encodeURIComponent(o.stripe_session_id)}`}
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          Open in Stripe <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (o.note || "") && save({ note: note.trim() || null })}
        rows={1}
        placeholder="Internal note (saves when you click away)"
        className="w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </li>
  );
}
