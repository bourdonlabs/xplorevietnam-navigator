"use client";
// Admin data for the public website: leads from its forms and paid orders from its cart (0006_website.sql).
// Same pattern as admin.ts: live Supabase (staff-only by row level security) or demo sample data.
import { IS_DEMO } from "./supabase/env";
import { supabaseBrowser } from "./supabase/client";

export type LeadKind = "consultation" | "contact" | "order_request" | "quiz" | "newsletter";
export const LEAD_KINDS: { value: LeadKind; label: string; tone: string }[] = [
  { value: "consultation", label: "Free call request", tone: "bg-violet-50 text-violet-700 ring-violet-200" },
  { value: "order_request", label: "Order / quote request", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  { value: "contact", label: "Contact message", tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  { value: "quiz", label: "City quiz", tone: "bg-teal-50 text-teal-700 ring-teal-200" },
  { value: "newsletter", label: "Newsletter", tone: "bg-gray-100 text-gray-700 ring-gray-200" },
];
export type LeadStatus = "new" | "contacted" | "closed";
export const LEAD_STATUSES: { value: LeadStatus; label: string; tone: string }[] = [
  { value: "new", label: "New", tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  { value: "contacted", label: "Contacted", tone: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  { value: "closed", label: "Closed", tone: "bg-gray-100 text-gray-600 ring-gray-200" },
];

export type Lead = {
  id: string;
  kind: LeadKind;
  name: string | null;
  email: string;
  phone: string | null;
  message: string | null;
  data: Record<string, unknown>;
  page: string | null;
  status: LeadStatus;
  note: string | null;
  created_at: string;
};

export type OrderStatus = "paid" | "in_progress" | "completed" | "refunded" | "cancelled";
export const ORDER_STATUSES: { value: OrderStatus; label: string; tone: string }[] = [
  { value: "paid", label: "Paid", tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  { value: "in_progress", label: "In progress", tone: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  { value: "completed", label: "Completed", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { value: "refunded", label: "Refunded", tone: "bg-rose-50 text-rose-700 ring-rose-200" },
  { value: "cancelled", label: "Cancelled", tone: "bg-gray-100 text-gray-600 ring-gray-200" },
];
export type OrderItem = {
  sku: string;
  name: string;
  dependents: number;
  options: Record<string, string>;
  addons: string[];
  price_usd: number | null;
  paid_now_usd: number;
  deposit: number;
};
export type Order = {
  id: string;
  stripe_session_id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  address: { city?: string; country?: string; line1?: string; postal_code?: string } | null;
  items: OrderItem[];
  amount_total: number; // cents
  currency: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
};
/** Balance still owed on deposit orders (USD). */
export const orderBalance = (o: Order) => o.items.reduce((s, i) => s + (i.price_usd || 0) - Math.round((i.price_usd || 0) * (i.deposit || 1)), 0);

type Result = { error?: string };
export interface WebAdmin {
  listLeads(): Promise<Lead[]>;
  updateLead(id: string, patch: { status?: LeadStatus; note?: string | null }): Promise<Result>;
  deleteLead(id: string): Promise<Result>;
  listOrders(): Promise<Order[]>;
  updateOrder(id: string, patch: { status?: OrderStatus; note?: string | null }): Promise<Result>;
}

async function pages<T>(table: string, cols: string) {
  const db = supabaseBrowser();
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(cols).order("created_at", { ascending: false }).range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...((data as T[]) || []));
    if (!data || data.length < 1000) return out;
  }
}
const res = (e: { message: string } | null): Result => (e ? { error: e.message } : {});

const live: WebAdmin = {
  listLeads: () => pages<Lead>("website_leads", "id, kind, name, email, phone, message, data, page, status, note, created_at"),
  async updateLead(id, patch) {
    return res((await supabaseBrowser().from("website_leads").update(patch).eq("id", id)).error);
  },
  async deleteLead(id) {
    return res((await supabaseBrowser().from("website_leads").delete().eq("id", id)).error);
  },
  listOrders: () => pages<Order>("orders", "id, stripe_session_id, email, name, phone, address, items, amount_total, currency, status, note, created_at"),
  async updateOrder(id, patch) {
    return res((await supabaseBrowser().from("orders").update(patch).eq("id", id)).error);
  },
};

// ───────── Demo sample data ─────────
const H = 3600000;
const ago = (h: number) => new Date(Date.now() - h * H).toISOString();
const SEED_LEADS: Lead[] = [
  { id: "l1", kind: "consultation", name: "Megan Clarke", email: "megan.clarke@example.com", phone: "+1 416 555 0142", message: "Moving with my husband and two kids next summer. He has a job offer in HCMC.", data: { interest: "Work permit", preferred_time: "Weekday evenings, Vietnam time" }, page: "get-started.html", status: "new", note: null, created_at: ago(3) },
  { id: "l2", kind: "order_request", name: "Paul Weber", email: "paul.weber@example.com", phone: "+49 151 5550 1234", message: null, data: { items: [{ sku: "svc-business-2", name: "Company + Visa Package", dependents: 1, addons: [], options: {}, price: null }], estimate_usd: null }, page: "cart.html", status: "new", note: null, created_at: ago(9) },
  { id: "l3", kind: "contact", name: "Aiko Sato", email: "aiko.sato@example.com", phone: null, message: "Can you help with a TRC renewal if my employer changes?", data: {}, page: "contact.html", status: "contacted", note: "Replied, waiting on her new contract.", created_at: ago(30) },
  { id: "l4", kind: "quiz", name: "Liam Brown", email: "liam.brown@example.com", phone: null, message: null, data: { result: "Da Nang" }, page: "quiz.html", status: "new", note: null, created_at: ago(52) },
  { id: "l5", kind: "newsletter", name: "Sofia Rossi", email: "sofia.rossi@example.com", phone: null, message: null, data: {}, page: "blog-cost-of-living-da-nang.html", status: "new", note: null, created_at: ago(70) },
  { id: "l6", kind: "consultation", name: "James Wilson", email: "james.wilson@example.com", phone: "+44 7700 900123", message: "Retiring next year, looking at Da Nang or Hoi An.", data: { interest: "Relocation and housing", preferred_time: "Any morning" }, page: "get-started.html", status: "closed", note: "Call done, sent Concierge proposal.", created_at: ago(120) },
];
const SEED_ORDERS: Order[] = [
  { id: "o1", stripe_session_id: "cs_test_demo1", email: "emma.walker@example.com", name: "Emma Walker", phone: "+61 400 555 010", address: { city: "Sydney", country: "AU" }, items: [{ sku: "rl-get-to-vietnam", name: "Get to Vietnam Package", dependents: 0, options: {}, addons: ["Vietnamese bank account"], price_usd: 2450, paid_now_usd: 2775, deposit: 1 }], amount_total: 277500, currency: "usd", status: "in_progress", note: "Docs received, visa filed.", created_at: ago(40) },
  { id: "o2", stripe_session_id: "cs_test_demo2", email: "noah.martin@example.com", name: "Noah Martin", phone: "+1 604 555 0199", address: { city: "Vancouver", country: "CA" }, items: [{ sku: "svc-trc-2", name: "TRC + Permit Package", dependents: 1, options: {}, addons: [], price_usd: 3340, paid_now_usd: 2338, deposit: 0.7 }], amount_total: 233800, currency: "usd", status: "paid", note: null, created_at: ago(6) },
  { id: "o3", stripe_session_id: "cs_test_demo3", email: "ava.nguyen@example.com", name: "Ava Nguyen", phone: null, address: { city: "Austin", country: "US" }, items: [{ sku: "overstay-review", name: "Overstay Case Review", dependents: 0, options: {}, addons: [], price_usd: 59, paid_now_usd: 59, deposit: 1 }], amount_total: 5900, currency: "usd", status: "completed", note: null, created_at: ago(200) },
];
const KEY = "xv-demo-web-admin";
type DemoState = { leads: Record<string, Partial<Lead> | null>; orders: Record<string, Partial<Order>> };
const load = (): DemoState => {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "") as DemoState;
  } catch {
    return { leads: {}, orders: {} };
  }
};
const save = (s: DemoState) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {}
};
const demo: WebAdmin = {
  async listLeads() {
    const s = load();
    return SEED_LEADS.filter((l) => s.leads[l.id] !== null).map((l) => ({ ...l, ...s.leads[l.id] }));
  },
  async updateLead(id, patch) {
    const s = load();
    s.leads[id] = { ...s.leads[id], ...patch };
    save(s);
    return {};
  },
  async deleteLead(id) {
    const s = load();
    s.leads[id] = null;
    save(s);
    return {};
  },
  async listOrders() {
    const s = load();
    return SEED_ORDERS.map((o) => ({ ...o, ...s.orders[o.id] })).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async updateOrder(id, patch) {
    const s = load();
    s.orders[id] = { ...s.orders[id], ...patch };
    save(s);
    return {};
  },
};

export const web: WebAdmin = IS_DEMO ? demo : live;
