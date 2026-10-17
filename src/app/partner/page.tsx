"use client";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Copy, MessageCircle, ShieldAlert } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { TimeBars } from "@/components/admin/charts";
import { Empty, Loading, PageHeader, Panel, Pill, fmtDate, usd } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import {
  PROGRAMS, PROMOTE_OPTIONS, STATE_META, commissionState, partnerProgram, shareLink,
  type Commission, type Partner, type RegisterInput, type Summary,
} from "@/lib/partner-program";

const money = (n: number) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n: number) => `${Math.round(n * 10000) / 100}%`;

type Outcome =
  | { kind: "ready"; partner: Partner }
  | { kind: "join"; prefill: RegisterInput | null; error: string }
  | { kind: "error"; message: string };

/** Finds the signed-in user's partner account, or finishes one from the details saved at website sign-up. */
async function resolveAccount(userId: string): Promise<Outcome> {
  try {
    const mine = await partnerProgram.mine(userId);
    if (mine) return { kind: "ready", partner: mine };
    const pending = await partnerProgram.pendingSignup();
    if (pending) {
      const r = await partnerProgram.register(pending);
      if (r.partner) return { kind: "ready", partner: r.partner };
      return { kind: "join", prefill: pending, error: r.error || "" };
    }
    return { kind: "join", prefill: null, error: "" };
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : "Something went wrong." };
  }
}

export default function PartnerPage() {
  const { user } = useAuth();
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!partnerProgram.available || !user) return;
    let live = true;
    resolveAccount(user.id).then((o) => live && setOutcome(o));
    return () => {
      live = false;
    };
  }, [user, attempt]);

  if (!partnerProgram.available) {
    return (
      <Panel title="Partner program">
        <p className="text-sm text-gray-600">Partner accounts need the live database, so they are not available in demo mode.</p>
      </Panel>
    );
  }
  if (!outcome) return <Loading />;
  if (outcome.kind === "error") {
    return (
      <Panel title="We could not load your partner account">
        <p className="text-sm text-gray-600">{outcome.message}</p>
        <Button className="mt-4" onClick={() => { setOutcome(null); setAttempt((n) => n + 1); }}>Try again</Button>
      </Panel>
    );
  }
  if (outcome.kind === "join") {
    return <JoinForm initial={outcome.prefill} initialError={outcome.error} onDone={(partner) => setOutcome({ kind: "ready", partner })} />;
  }
  return <Dashboard partner={outcome.partner} onChange={(partner) => setOutcome({ kind: "ready", partner })} />;
}

// ───────── Join ─────────
function JoinForm({ initial, initialError, onDone }: { initial: RegisterInput | null; initialError: string; onDone: (p: Partner) => void }) {
  const [v, setV] = useState<RegisterInput>(initial || { username: "", code: "", name: "", paypal_email: "", promote_via: "", content_url: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(initialError);
  const set = (k: keyof RegisterInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setV({ ...v, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!v.username.trim() || !v.code.trim()) return setError("Choose a username and a coupon code.");
    setBusy(true);
    setError("");
    const r = await partnerProgram.register({ ...v, code: v.code.toUpperCase().replace(/[^A-Z0-9]/g, "") });
    setBusy(false);
    if (r.error || !r.partner) return setError(r.error || "Something went wrong.");
    toast.success("Your partner account is ready");
    onDone(r.partner);
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader title="Join the partner program" subtitle="Help a friend, earn rewards. Pick your coupon code and we will set up your account." />
      <Panel>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label htmlFor="pj-name">Name</Label>
            <Input id="pj-name" value={v.name || ""} onChange={set("name")} maxLength={200} autoComplete="name" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pj-user">Your username *</Label>
              <Input id="pj-user" value={v.username} onChange={set("username")} maxLength={30} required autoComplete="username" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pj-code">Coupon code *</Label>
              <Input id="pj-code" value={v.code} onChange={set("code")} maxLength={20} required className="uppercase" placeholder="e.g. YOURNAME5" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pj-how">How will you promote us?</Label>
            <Select id="pj-how" value={v.promote_via || ""} onChange={set("promote_via")}>
              <option value="">Choose one</option>
              {PROMOTE_OPTIONS.map((o) => <option key={o}>{o}</option>)}
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="pj-paypal">PayPal email</Label>
            <Input id="pj-paypal" type="email" value={v.paypal_email || ""} onChange={set("paypal_email")} maxLength={320} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pj-url">Content URL</Label>
            <Input id="pj-url" type="url" value={v.content_url || ""} onChange={set("content_url")} maxLength={300} placeholder="Link to your channel, blog or group" />
          </div>
          {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? "Creating..." : "Create my partner account"}</Button>
        </form>
      </Panel>
    </div>
  );
}

// ───────── Dashboard ─────────
function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          toast.error("Could not copy. Select the text and copy it by hand.");
        }
      }}
      className="inline-flex h-9 flex-shrink-0 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-brand-navy hover:bg-gray-50"
      aria-label={label}
    >
      {done ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />} {done ? "Copied" : "Copy"}
    </button>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${tone || "text-brand-navy"}`}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}

function Dashboard({ partner, onChange }: { partner: Partner; onChange: (p: Partner) => void }) {
  const [sum, setSum] = useState<Summary | null>(null);
  const [rows, setRows] = useState<Commission[] | null>(null);
  const [clicks, setClicks] = useState<{ key: string; label: string; value: number }[] | null>(null);

  useEffect(() => {
    partnerProgram.summary(partner.id).then(setSum);
    partnerProgram.commissions(partner.id).then(setRows).catch(() => setRows([]));
    partnerProgram.clicksByDay(partner.id, 30).then(setClicks);
  }, [partner.id]);

  const link = shareLink(partner.code);
  const message = `Moving to Vietnam? XploreVietnam handles visas, residence cards, company setup and relocation. Use my code ${partner.code} for ${pct(partner.customer_discount)} off: ${link}`;
  const clicks30 = useMemo(() => (clicks || []).reduce((s, d) => s + d.value, 0), [clicks]);
  const program = PROGRAMS.find((p) => p.value === partner.program)?.label || "Partner";
  const suspended = partner.status === "suspended";

  return (
    <>
      <PageHeader
        title="Partner dashboard"
        subtitle={<>{program} · {pct(partner.commission_rate)} commission · customers get {pct(partner.customer_discount)} off</>}
        action={suspended ? <Pill tone="bg-rose-50 text-rose-700 ring-rose-200">Suspended</Pill> : <Pill tone="bg-emerald-50 text-emerald-700 ring-emerald-200">Active</Pill>}
      />

      {suspended && (
        <div className="flex gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <p>Your partner account is suspended, so your code and link do not work right now. Email info@xplorevietnam.org to find out why.</p>
        </div>
      )}

      <Panel title="Share and earn">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Your coupon code</p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="flex-1 rounded-md bg-brand-tint px-3 py-2 text-lg font-bold tracking-wider text-primary">{partner.code}</code>
                <CopyButton text={partner.code} label="Copy coupon code" />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">Friends enter it at checkout and get {pct(partner.customer_discount)} off. You earn {pct(partner.commission_rate)} on the sale.</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Your link</p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-gray-50 px-3 py-2 text-sm text-brand-navy">{link}</code>
                <CopyButton text={link} label="Copy your link" />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">Anyone who opens it is tracked for up to a year, and your code is filled in at checkout for them.</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ready-to-send message</p>
            <p className="mt-1.5 rounded-md bg-gray-50 p-3 text-sm leading-relaxed text-brand-navy">{message}</p>
            <div className="mt-2 flex gap-2">
              <CopyButton text={message} label="Copy message" />
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-gray-200 bg-white px-3 text-sm font-medium text-brand-navy hover:bg-gray-50"
              >
                <MessageCircle className="h-4 w-4" /> WhatsApp
              </a>
            </div>
          </div>
        </div>
      </Panel>

      {!sum ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="h-24 animate-pulse rounded-xl bg-white" />)}</div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          <Stat label="Clicks" value={sum.visits.toLocaleString("en-US")} sub={clicks ? `${clicks30} in the last 30 days` : undefined} />
          <Stat label="Sales" value={String(sum.sales)} sub={`${usd(Math.round(sum.sales_usd))} sold`} />
          <Stat label="Pending" value={money(sum.pending_usd)} sub="Payable 30 days after purchase" />
          <Stat label="Payable now" value={money(sum.payable_usd)} sub="Paid in the next payout" tone="text-primary" />
          <Stat label="Paid out" value={money(sum.paid_usd)} />
        </div>
      )}

      <Panel title="Clicks, last 30 days">
        {clicks ? <TimeBars data={clicks} unit="click" /> : <div className="h-52 animate-pulse rounded bg-gray-50" />}
      </Panel>

      <Panel title="Commissions" bodyClass="p-0">
        {!rows ? (
          <div className="m-5 h-24 animate-pulse rounded bg-gray-50" />
        ) : rows.length === 0 ? (
          <Empty>No sales yet. When someone pays with your code or link, the commission shows up here.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="px-5 py-2.5">Date</th>
                  <th className="px-3 py-2.5 text-right">Sale</th>
                  <th className="px-3 py-2.5 text-right">Rate</th>
                  <th className="px-3 py-2.5 text-right">Commission</th>
                  <th className="px-5 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((c) => {
                  const st = commissionState(c);
                  return (
                    <tr key={c.id}>
                      <td className="px-5 py-3 text-brand-navy">{fmtDate(c.created_at)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{money(c.sale_usd)}</td>
                      <td className="px-3 py-3 text-right tabular-nums text-gray-600">{pct(c.rate)}</td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums text-brand-navy">{money(c.commission_usd)}</td>
                      <td className="px-5 py-3">
                        <Pill tone={STATE_META[st].tone}>{STATE_META[st].label}</Pill>
                        <span className="ml-2 text-xs text-gray-500">
                          {st === "pending" && `payable ${fmtDate(c.payable_on)}`}
                          {st === "paid" && `${fmtDate(c.paid_at)}${c.payout_ref ? ` · ${c.payout_ref}` : ""}`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <PayoutForm partner={partner} onChange={onChange} />

      <p className="pb-4 text-center text-xs text-gray-500">
        Referrals are tracked for up to a year. Rewards are paid 30 days after purchase via PayPal or bank transfer.
        Commission is calculated on what the customer pays at checkout.
      </p>
    </>
  );
}

function PayoutForm({ partner, onChange }: { partner: Partner; onChange: (p: Partner) => void }) {
  const [v, setV] = useState({
    name: partner.name || "",
    payout_method: partner.payout_method,
    paypal_email: partner.paypal_email || "",
    bank_details: partner.bank_details || "",
    content_url: partner.content_url || "",
  });
  const [busy, setBusy] = useState(false);
  const missing = v.payout_method === "paypal" ? !v.paypal_email.trim() : !v.bank_details.trim();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const patch = {
      name: v.name.trim() || null,
      payout_method: v.payout_method,
      paypal_email: v.paypal_email.trim() || null,
      bank_details: v.bank_details.trim() || null,
      content_url: v.content_url.trim() || null,
    };
    const r = await partnerProgram.updateDetails(partner.id, patch);
    setBusy(false);
    if (r.error) return toast.error("Could not save: " + r.error);
    onChange({ ...partner, ...patch });
    toast.success("Saved");
  };

  return (
    <Panel title="Payout details">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={save}>
        <div className="space-y-2">
          <Label htmlFor="pd-name">Name</Label>
          <Input id="pd-name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} maxLength={200} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pd-method">Get paid by</Label>
          <Select id="pd-method" value={v.payout_method} onChange={(e) => setV({ ...v, payout_method: e.target.value as "paypal" | "bank" })}>
            <option value="paypal">PayPal</option>
            <option value="bank">Bank transfer</option>
          </Select>
        </div>
        {v.payout_method === "paypal" ? (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pd-paypal">PayPal email</Label>
            <Input id="pd-paypal" type="email" value={v.paypal_email} onChange={(e) => setV({ ...v, paypal_email: e.target.value })} maxLength={320} />
          </div>
        ) : (
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="pd-bank">Bank details</Label>
            <textarea
              id="pd-bank"
              value={v.bank_details}
              onChange={(e) => setV({ ...v, bank_details: e.target.value })}
              maxLength={1000}
              rows={4}
              placeholder="Account holder, bank name, account number or IBAN, SWIFT/BIC, country"
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
        )}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="pd-url">Content URL</Label>
          <Input id="pd-url" type="url" value={v.content_url} onChange={(e) => setV({ ...v, content_url: e.target.value })} maxLength={300} />
        </div>
        <div className="flex items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save"}</Button>
          {missing && <p className="text-sm text-amber-700">Add your {v.payout_method === "paypal" ? "PayPal email" : "bank details"} so we can pay you.</p>}
        </div>
      </form>
    </Panel>
  );
}
