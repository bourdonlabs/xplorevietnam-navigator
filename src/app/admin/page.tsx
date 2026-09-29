"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CircleDollarSign, ClipboardList, UserCheck, Users } from "lucide-react";
import { Avatar } from "@/components/avatar";
import { BarList, TimeBars } from "@/components/admin/charts";
import {
  Empty, Loading, PageHeader, Panel, StatusPill, clientName, daysUntil, fmtDate, moveStageLabel, serviceName, timeAgo, usd, visaLabel,
} from "@/components/admin/ui";
import { OPEN_STATUSES, PAID_STATUSES, STAGES, admin, type AdminClient } from "@/lib/admin";
import { cn } from "@/lib/utils";

const DAY = 86400000;

export default function AdminOverview() {
  // "now" is fixed when the data loads so every number on the page uses the same moment.
  const [data, setData] = useState<{ clients: AdminClient[]; now: number } | null>(null);
  const [range, setRange] = useState<30 | 90>(30);

  useEffect(() => {
    admin.listClients().then((clients) => setData({ clients, now: Date.now() }));
  }, []);

  const m = useMemo(() => {
    if (!data) return null;
    const { clients, now } = data;
    const since = (d: number) => clients.filter((c) => now - new Date(c.created_at).getTime() < d * DAY).length;
    const reqs = clients.flatMap((c) => c.requests.map((r) => ({ ...r, client: c })));
    const open = reqs.filter((r) => OPEN_STATUSES.includes(r.status)).sort((a, b) => a.created_at.localeCompare(b.created_at));
    const paid = reqs.filter((r) => PAID_STATUSES.includes(r.status));
    const paid30 = paid.filter((r) => now - new Date(r.created_at).getTime() < 30 * DAY);
    const onboarded = clients.filter((c) => c.onboarded_at);
    const count = (key: (c: AdminClient) => string | null | undefined, label: (v: string) => string = (v) => v) => {
      const m = new Map<string, number>();
      for (const c of onboarded) {
        const k = key(c);
        if (k) m.set(k, (m.get(k) || 0) + 1);
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: label(k), value: v }));
    };
    return {
      total: clients.length,
      last7: since(7),
      prev7: since(14) - since(7),
      onboardRate: clients.length ? Math.round((onboarded.length / clients.length) * 100) : 0,
      onboarded: onboarded.length,
      unconfirmed: clients.filter((c) => !c.email_confirmed_at).length,
      open,
      openValue: open.reduce((s, r) => s + r.amount_usd, 0),
      revenue30: paid30.reduce((s, r) => s + r.amount_usd, 0),
      revenueAll: paid.reduce((s, r) => s + r.amount_usd, 0),
      visa: count((c) => c.visa_type, visaLabel),
      city: count((c) => c.destination_city),
      stage: count((c) => c.move_stage, moveStageLabel),
      nationality: count((c) => c.nationality).slice(0, 6),
      pipeline: STAGES.map((s) => ({ label: s.label, value: clients.filter((c) => c.stage === s.value).length })),
      newest: clients.slice(0, 6),
      movingSoon: onboarded
        .map((c) => ({ c, d: daysUntil(c.anticipated_move_date) }))
        .filter((x) => x.d != null && x.d >= 0 && x.d <= 90 && x.c.move_stage !== "moved")
        .sort((a, b) => a.d! - b.d!)
        .slice(0, 6),
    };
  }, [data]);

  const series = useMemo(() => {
    if (!data) return [];
    const { clients, now } = data;
    const days: { key: string; label: string; value: number }[] = [];
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(start.getTime() - i * DAY);
      days.push({ key: d.toDateString(), label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), value: 0 });
    }
    const idx = new Map(days.map((d, i) => [d.key, i]));
    for (const c of clients) {
      const k = new Date(c.created_at);
      k.setHours(0, 0, 0, 0);
      const i = idx.get(k.toDateString());
      if (i != null) days[i].value++;
    }
    return days;
  }, [data, range]);

  if (!m) return <Loading />;
  const delta = m.last7 - m.prev7;
  const inRange = series.reduce((s, d) => s + d.value, 0);

  return (
    <>
      <PageHeader title="Overview" subtitle="Everyone using Navigator, what they need, and what needs your attention." />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Users} label="Clients" value={m.total.toLocaleString()} href="/admin/clients">
          <span className={cn(delta > 0 ? "text-emerald-700" : delta < 0 ? "text-gray-600" : "text-gray-500")}>+{m.last7} in the last 7 days</span>
        </Kpi>
        <Kpi icon={UserCheck} label="Finished onboarding" value={`${m.onboardRate}%`}>
          {m.onboarded} of {m.total}
          {m.unconfirmed > 0 && ` · ${m.unconfirmed} email${m.unconfirmed === 1 ? "" : "s"} unconfirmed`}
        </Kpi>
        <Kpi icon={ClipboardList} label="Open requests" value={String(m.open.length)} href="/admin/requests">
          {usd(m.openValue)} in the queue
        </Kpi>
        <Kpi icon={CircleDollarSign} label="Paid, last 30 days" value={usd(m.revenue30)}>
          {usd(m.revenueAll)} all time
        </Kpi>
      </div>

      <Panel
        title={
          <span>
            New sign-ups <span className="font-normal text-gray-500">· {inRange} in the last {range} days</span>
          </span>
        }
        action={
          <div className="flex rounded-md border border-gray-200 p-0.5 text-xs">
            {([30, 90] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn("rounded px-2.5 py-1", range === r ? "bg-brand-navy text-white" : "text-gray-600 hover:bg-gray-50")}
              >
                {r} days
              </button>
            ))}
          </div>
        }
      >
        <TimeBars data={series} />
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title={`Needs attention (${m.open.length})`}
          action={<Link href="/admin/requests" className="text-xs font-medium text-primary hover:underline">All requests</Link>}
          bodyClass="p-0"
        >
          {m.open.length === 0 ? (
            <Empty>Nothing waiting. New service requests appear here.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100">
              {m.open.slice(0, 6).map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/clients/${r.user_id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-brand-navy">{serviceName(r.service)}</p>
                      <p className="truncate text-xs text-gray-500">
                        {clientName(r.client)} · {timeAgo(r.created_at)}
                      </p>
                    </div>
                    <span className="text-sm tabular-nums text-brand-navy">{usd(r.amount_usd)}</span>
                    <StatusPill status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="Newest sign-ups"
          action={<Link href="/admin/clients" className="text-xs font-medium text-primary hover:underline">All clients</Link>}
          bodyClass="p-0"
        >
          {m.newest.length === 0 ? (
            <Empty>No sign-ups yet.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100">
              {m.newest.map((c) => (
                <li key={c.user_id}>
                  <Link href={`/admin/clients/${c.user_id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <Avatar profile={c} email={c.email || ""} className="h-8 w-8 text-xs" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-brand-navy">{clientName(c)}</p>
                      <p className="truncate text-xs text-gray-500">
                        {c.onboarded_at ? [visaLabel(c.visa_type), c.destination_city].filter((x) => x && x !== "—").join(" · ") : "Hasn't finished onboarding"}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-500">{timeAgo(c.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        <Panel title="Pipeline">
          <BarList rows={m.pipeline} total={m.total} />
        </Panel>
        <Panel title="Visa route">
          <BarList rows={m.visa} total={m.onboarded} />
        </Panel>
        <Panel title="Destination city">
          <BarList rows={m.city} total={m.onboarded} />
        </Panel>
        <Panel title="Where they are in the move">
          <BarList rows={m.stage} total={m.onboarded} />
        </Panel>
        <Panel title="Top nationalities">
          <BarList rows={m.nationality} total={m.onboarded} />
        </Panel>
        <Panel title="Moving in the next 90 days" bodyClass="p-0">
          {m.movingSoon.length === 0 ? (
            <Empty>No one has a move date in the next 90 days.</Empty>
          ) : (
            <ul className="divide-y divide-gray-100">
              {m.movingSoon.map(({ c, d }) => (
                <li key={c.user_id}>
                  <Link href={`/admin/clients/${c.user_id}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-gray-50">
                    <CalendarClock className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <span className="min-w-0 flex-1 truncate text-sm text-brand-navy">{clientName(c)}</span>
                    <span className="flex-shrink-0 text-xs text-gray-500">
                      {fmtDate(c.anticipated_move_date)} · {d === 0 ? "today" : `in ${d}d`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function Kpi({
  icon: Icon, label, value, children, href,
}: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; children?: React.ReactNode; href?: string }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-gray-500">{label}</p>
        <Icon className="h-4 w-4 text-gray-400" />
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-brand-navy sm:text-3xl">{value}</p>
      <p className="mt-1 truncate text-xs text-gray-500">{children}</p>
      {href && <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 text-gray-300 transition-colors group-hover:text-primary" />}
    </>
  );
  const cls = "group relative block rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5";
  return href ? (
    <Link href={href} className={cn(cls, "hover:border-primary/40")}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
