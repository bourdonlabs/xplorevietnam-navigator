"use client";
// Admin data layer. Same pattern as backend.ts: a live Supabase implementation (staff-only, enforced by the
// database rules in 0005_admin.sql) and a demo implementation with sample clients so the screens can be
// reviewed without keys. Demo mode never runs in production: it only switches on when no Supabase keys are set.
import { IS_DEMO } from "./supabase/env";
import { supabaseBrowser } from "./supabase/client";
import type { Dependent, Profile, UploadedDoc } from "./backend";
import { CHECKLISTS } from "./visa-docs";

export type Stage = "new" | "contacted" | "consultation" | "proposal" | "client" | "lost";
export const STAGES: { value: Stage; label: string; tone: string }[] = [
  { value: "new", label: "New", tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  { value: "contacted", label: "Contacted", tone: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  { value: "consultation", label: "Consultation", tone: "bg-violet-50 text-violet-700 ring-violet-200" },
  { value: "proposal", label: "Proposal sent", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  { value: "client", label: "Client", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { value: "lost", label: "Lost", tone: "bg-gray-100 text-gray-600 ring-gray-200" },
];

export type RequestStatus = "requested" | "paid" | "in_progress" | "completed" | "cancelled";
export const REQUEST_STATUSES: { value: RequestStatus; label: string; tone: string }[] = [
  { value: "requested", label: "Requested", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  { value: "paid", label: "Paid", tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  { value: "in_progress", label: "In progress", tone: "bg-indigo-50 text-indigo-700 ring-indigo-200" },
  { value: "completed", label: "Completed", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  { value: "cancelled", label: "Cancelled", tone: "bg-gray-100 text-gray-600 ring-gray-200" },
];
/** Statuses that still need the team to do something. */
export const OPEN_STATUSES: RequestStatus[] = ["requested", "paid", "in_progress"];
/** Statuses that count as money received. */
export const PAID_STATUSES: RequestStatus[] = ["paid", "in_progress", "completed"];

export type AdminRequest = {
  id: string;
  user_id: string;
  service: string;
  quantity: number;
  dependents: number;
  amount_usd: number;
  status: RequestStatus;
  note: string | null;
  stripe_session_id?: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminClient = Profile & {
  created_at: string;
  stage: Stage;
  assigned_to: string | null;
  docs: number;
  checklist: number;
  journey: number;
  dependents: number;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  requests: AdminRequest[];
};

export type Note = { id: string; client_id: string; author_id: string | null; body: string; created_at: string };
export type StaffMember = { user_id: string; full_name: string; title: string | null; email: string | null; whatsapp: string | null; created_at: string };

export type ClientDetail = {
  client: AdminClient;
  dependentsList: Dependent[];
  docsList: UploadedDoc[];
  checklistKeys: string[];
  journeyIds: number[];
  cost: Record<string, string> | null;
  costUpdatedAt: string | null;
  notes: Note[];
};

type Result = { error?: string };

export interface AdminBackend {
  isStaff(uid: string): Promise<boolean>;
  listClients(): Promise<AdminClient[]>;
  getClient(id: string): Promise<ClientDetail | null>;
  listRequests(): Promise<AdminRequest[]>;
  updateRequest(id: string, patch: { status?: RequestStatus; note?: string | null }): Promise<Result>;
  setPipeline(clientId: string, patch: { stage?: Stage; assigned_to?: string | null }): Promise<Result>;
  addNote(clientId: string, body: string): Promise<{ note?: Note; error?: string }>;
  deleteNote(id: string): Promise<Result>;
  listStaff(): Promise<StaffMember[]>;
  fileUrl(path: string): Promise<string | null>;
}

// ───────────────────────── Live (Supabase) ─────────────────────────

/** PostgREST returns at most 1000 rows per call, so read in pages. */
async function all<T>(make: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await make(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data || []));
    if (!data || data.length < 1000) return out;
  }
}

type Pipe = { client_id: string; stage: Stage; assigned_to: string | null };
type Activity = { user_id: string; docs: number; checklist: number; journey: number; dependents: number };
type Auth = { user_id: string; email_confirmed_at: string | null; last_sign_in_at: string | null };

function merge(profiles: (Profile & { created_at: string })[], acts: Activity[], pipes: Pipe[], auths: Auth[], reqs: AdminRequest[]): AdminClient[] {
  const act = new Map(acts.map((a) => [a.user_id, a]));
  const pipe = new Map(pipes.map((p) => [p.client_id, p]));
  const auth = new Map(auths.map((a) => [a.user_id, a]));
  const byUser = new Map<string, AdminRequest[]>();
  for (const r of reqs) byUser.set(r.user_id, [...(byUser.get(r.user_id) || []), r]);
  return profiles.map((p) => ({
    ...p,
    stage: pipe.get(p.user_id)?.stage || "new",
    assigned_to: pipe.get(p.user_id)?.assigned_to || null,
    docs: act.get(p.user_id)?.docs || 0,
    checklist: act.get(p.user_id)?.checklist || 0,
    journey: act.get(p.user_id)?.journey || 0,
    dependents: act.get(p.user_id)?.dependents || 0,
    email_confirmed_at: auth.get(p.user_id)?.email_confirmed_at || null,
    last_sign_in_at: auth.get(p.user_id)?.last_sign_in_at || null,
    requests: byUser.get(p.user_id) || [],
  }));
}

const REQ_COLS = "id, user_id, service, quantity, dependents, amount_usd, status, note, stripe_session_id, created_at, updated_at";

const live: AdminBackend = {
  async isStaff(uid) {
    const { data } = await supabaseBrowser().from("staff").select("user_id").eq("user_id", uid).maybeSingle();
    return !!data;
  },
  async listClients() {
    const db = supabaseBrowser();
    const staffIds = new Set((await this.listStaff()).map((s) => s.user_id));
    const [profiles, acts, pipes, auths, reqs] = await Promise.all([
      all<Profile & { created_at: string }>((a, b) => db.from("profiles").select("*").order("created_at", { ascending: false }).range(a, b)),
      all<Activity>((a, b) => db.from("client_activity").select("*").range(a, b)),
      all<Pipe>((a, b) => db.from("client_pipeline").select("client_id, stage, assigned_to").range(a, b)),
      all<Auth>((a, b) => db.rpc("admin_auth_activity").range(a, b)),
      all<AdminRequest>((a, b) => db.from("service_requests").select(REQ_COLS).order("created_at", { ascending: false }).range(a, b)),
    ]);
    // Team members have profiles too; keep them out of the client numbers.
    return merge(profiles.filter((p) => !staffIds.has(p.user_id)), acts, pipes, auths, reqs);
  },
  async getClient(id) {
    const db = supabaseBrowser();
    const [p, act, pipe, auth, reqs, deps, docs, ck, jp, cost, notes] = await Promise.all([
      db.from("profiles").select("*").eq("user_id", id).maybeSingle(),
      db.from("client_activity").select("*").eq("user_id", id).maybeSingle(),
      db.from("client_pipeline").select("client_id, stage, assigned_to").eq("client_id", id).maybeSingle(),
      db.rpc("admin_auth_activity").eq("user_id", id),
      db.from("service_requests").select(REQ_COLS).eq("user_id", id).order("created_at", { ascending: false }),
      db.from("dependents").select("id, full_name, created_at").eq("user_id", id).order("created_at"),
      db.from("visa_documents").select("id, applicant_id, doc_key, file_path, file_name, size_bytes, created_at").eq("user_id", id).order("created_at"),
      db.from("checklist_items").select("item_key").eq("user_id", id),
      db.from("journey_progress").select("item_id").eq("user_id", id),
      db.from("cost_calculations").select("inputs, updated_at").eq("user_id", id).maybeSingle(),
      db.from("client_notes").select("id, client_id, author_id, body, created_at").eq("client_id", id).order("created_at", { ascending: false }),
    ]);
    if (!p.data) return null;
    const [client] = merge(
      [p.data as Profile & { created_at: string }],
      act.data ? [act.data as Activity] : [],
      pipe.data ? [pipe.data as Pipe] : [],
      (auth.data as Auth[]) || [],
      (reqs.data as AdminRequest[]) || [],
    );
    return {
      client,
      dependentsList: (deps.data as Dependent[]) || [],
      docsList: (docs.data as UploadedDoc[]) || [],
      checklistKeys: ((ck.data as { item_key: string }[]) || []).map((r) => r.item_key),
      journeyIds: ((jp.data as { item_id: number }[]) || []).map((r) => r.item_id),
      cost: (cost.data?.inputs as Record<string, string>) || null,
      costUpdatedAt: (cost.data?.updated_at as string) || null,
      notes: (notes.data as Note[]) || [],
    };
  },
  async listRequests() {
    const db = supabaseBrowser();
    return all<AdminRequest>((a, b) => db.from("service_requests").select(REQ_COLS).order("created_at", { ascending: false }).range(a, b));
  },
  async updateRequest(id, patch) {
    const { error } = await supabaseBrowser().from("service_requests").update(patch).eq("id", id);
    return error ? { error: error.message } : {};
  },
  async setPipeline(clientId, patch) {
    const { error } = await supabaseBrowser()
      .from("client_pipeline")
      .upsert({ client_id: clientId, ...patch }, { onConflict: "client_id" });
    return error ? { error: error.message } : {};
  },
  async addNote(clientId, body) {
    const { data, error } = await supabaseBrowser()
      .from("client_notes")
      .insert({ client_id: clientId, body })
      .select("id, client_id, author_id, body, created_at")
      .single();
    return error ? { error: error.message } : { note: data as Note };
  },
  async deleteNote(id) {
    const { error } = await supabaseBrowser().from("client_notes").delete().eq("id", id);
    return error ? { error: error.message } : {};
  },
  async listStaff() {
    const { data } = await supabaseBrowser().from("staff").select("user_id, full_name, title, email, whatsapp, created_at").order("created_at");
    return (data as StaffMember[]) || [];
  },
  async fileUrl(path) {
    if (path.startsWith("data:")) return path;
    const { data } = await supabaseBrowser().storage.from("client-docs").createSignedUrl(path, 300);
    return data?.signedUrl || null;
  },
};

// ───────────────────────── Demo (sample data) ─────────────────────────

const DAY = 86400000;
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}
const FIRST = ["Emma", "Liam", "Sophie", "Noah", "Chloé", "Lucas", "Mia", "Oliver", "Hannah", "James", "Aiko", "Mateo", "Sarah", "Daniel", "Lena", "Thomas", "Ava", "Ethan", "Julia", "Ben", "Isla", "Marco", "Nina", "Ryan", "Elena", "Sam", "Grace", "Leo", "Priya", "Jack", "Freya", "Hugo", "Olivia", "Max", "Zoe", "Kenji"];
const LAST = ["Walker", "Martin", "Dubois", "Schmidt", "Nguyen", "Brown", "Tremblay", "Rossi", "Jansen", "Wilson", "Tanaka", "Garcia", "Kowalski", "Murphy", "Novak", "Taylor", "Clarke", "Moreau", "Fischer", "Hughes", "Silva", "Bauer", "Evans", "Kim", "Lefebvre", "O'Brien", "Meyer", "Anderson", "Patel", "Thompson", "Larsen", "Bernard", "White", "Weber", "Scott", "Sato"];
const NATS = ["United States", "Canada", "United Kingdom", "Australia", "France", "Germany", "Netherlands", "South Korea", "Japan", "Ireland", "New Zealand", "Italy"];
const DEMO_KEY = "xv-demo-admin";
const DEMO_STAFF: StaffMember[] = [
  { user_id: "staff-john", full_name: "John Bourdon", title: "Founder", email: "info@xplorevietnam.org", whatsapp: null, created_at: new Date(Date.now() - 90 * DAY).toISOString() },
];

type DemoState = { pipes: Record<string, Pipe>; notes: Note[]; reqs: Record<string, Partial<AdminRequest>> };
const demoState = (): DemoState => {
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) || "") as DemoState;
  } catch {
    return { pipes: {}, notes: [], reqs: {} };
  }
};
const saveDemo = (s: DemoState) => {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(s));
  } catch {}
};

let seedCache: { clients: AdminClient[]; docs: Record<string, UploadedDoc[]>; deps: Record<string, Dependent[]> } | null = null;
function seed() {
  if (seedCache) return seedCache;
  const r = rng(42);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const now = Date.now();
  const visas = ["work", "work", "work", "evisa", "investor", "family", "unsure"];
  const cities = ["Ho Chi Minh City", "Ho Chi Minh City", "Hanoi", "Da Nang", "Da Nang", "Hoi An", "Other"];
  const stages = ["researching", "planning", "moving_soon", "moving_soon", "moved"];
  const pipeline: Stage[] = ["new", "new", "new", "contacted", "contacted", "consultation", "proposal", "client", "lost"];
  const services = ["visa_review", "tax_code", "bank_account"];
  const prices: Record<string, number> = { visa_review: 595, tax_code: 150, bank_account: 325 };
  const clients: AdminClient[] = [];
  const docs: Record<string, UploadedDoc[]> = {};
  const deps: Record<string, Dependent[]> = {};
  for (let i = 0; i < 36; i++) {
    const id = `demo-client-${i + 1}`;
    const created = new Date(now - Math.floor(Math.pow(r(), 1.6) * 60 * DAY) - Math.floor(r() * DAY));
    const onboarded = r() > 0.15;
    const visa = pick(visas);
    const first = FIRST[i];
    const last = LAST[(i * 7) % LAST.length];
    const nDeps = visa === "family" || r() > 0.8 ? 1 + Math.floor(r() * 2) : 0;
    deps[id] = Array.from({ length: nDeps }, (_, k) => ({ id: `${id}-dep-${k}`, full_name: `${pick(FIRST)} ${last}`, created_at: created.toISOString() }));
    const list = CHECKLISTS[visa]?.docs.filter((d) => d.upload !== false) || [];
    const nDocs = onboarded ? Math.floor(r() * Math.min(list.length, 6)) : 0;
    docs[id] = list.slice(0, nDocs).map((d, k) => ({
      id: `${id}-doc-${k}`,
      applicant_id: null,
      doc_key: d.key,
      file_path: `${id}/visa/main/${d.key}/${d.key}.pdf`,
      file_name: `${d.key.replace(/_/g, "-")}.pdf`,
      size_bytes: 200000 + Math.floor(r() * 2000000),
      created_at: new Date(created.getTime() + (k + 1) * DAY * r()).toISOString(),
    }));
    const reqs: AdminRequest[] = [];
    if (onboarded && r() > 0.62) {
      const svc = pick(services);
      const st: RequestStatus = pick(["requested", "requested", "paid", "in_progress", "completed", "cancelled"]);
      const at = new Date(Math.min(now - 3600000, created.getTime() + r() * 10 * DAY)).toISOString();
      reqs.push({
        id: `${id}-req`, user_id: id, service: svc, quantity: 1, dependents: svc === "visa_review" ? nDeps : 0,
        amount_usd: prices[svc] + (svc === "visa_review" ? 125 * nDeps : 0), status: st, note: null, created_at: at, updated_at: at,
      });
    }
    const moveIn = Math.floor(20 + r() * 300);
    clients.push({
      user_id: id,
      email: `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "") + "@example.com",
      first_name: onboarded ? first : null,
      last_name: onboarded ? last : null,
      nationality: onboarded ? pick(NATS) : null,
      country_of_residence: onboarded ? pick(NATS) : null,
      move_stage: onboarded ? pick(stages) : null,
      anticipated_move_date: onboarded ? new Date(now + moveIn * DAY).toISOString().slice(0, 10) : null,
      visa_type: onboarded ? visa : null,
      has_sponsor: onboarded ? visa === "work" || visa === "investor" : null,
      sponsor_type: onboarded && visa === "work" ? "My Vietnamese employer" : null,
      onboarded_at: onboarded ? created.toISOString() : null,
      destination_city: onboarded ? pick(cities) : null,
      avatar_path: null,
      created_at: created.toISOString(),
      stage: onboarded ? pick(pipeline) : "new",
      assigned_to: r() > 0.5 ? "staff-john" : null,
      docs: docs[id].length,
      checklist: onboarded ? Math.floor(r() * 30) : 0,
      journey: onboarded ? Math.floor(r() * 9) : 0,
      dependents: nDeps,
      email_confirmed_at: r() > 0.08 ? created.toISOString() : null,
      last_sign_in_at: new Date(Math.min(now, created.getTime() + r() * 20 * DAY)).toISOString(),
      requests: reqs,
    });
  }
  clients.sort((a, b) => b.created_at.localeCompare(a.created_at));
  seedCache = { clients, docs, deps };
  return seedCache;
}
function demoClients(): AdminClient[] {
  const s = demoState();
  return seed().clients.map((c) => ({
    ...c,
    stage: s.pipes[c.user_id]?.stage || c.stage,
    assigned_to: s.pipes[c.user_id] ? s.pipes[c.user_id].assigned_to : c.assigned_to,
    requests: c.requests.map((q) => ({ ...q, ...s.reqs[q.id] })),
  }));
}

const demo: AdminBackend = {
  async isStaff() {
    return true;
  },
  async listClients() {
    return demoClients();
  },
  async getClient(id) {
    const client = demoClients().find((c) => c.user_id === id);
    if (!client) return null;
    const keys = ["flight", "passport-validity", "visa-docs", "health-insurance", "apps", "sim", "grab", "bank", "evisa", "cards"];
    return {
      client,
      dependentsList: seed().deps[id] || [],
      docsList: seed().docs[id] || [],
      checklistKeys: keys.slice(0, Math.min(keys.length, client.checklist)),
      journeyIds: Array.from({ length: client.journey }, (_, i) => i + 1),
      cost: client.onboarded_at
        ? { location: "hcm-thaodien", accommodation: "apartment", bedrooms: "2", quality: "mid", adults: "2", children: "1", aircon: "moderate", groceries: "mixed", grab: "moderate", insurance: "90", eatOut: "3" }
        : null,
      costUpdatedAt: client.onboarded_at,
      notes: demoState().notes.filter((n) => n.client_id === id).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    };
  },
  async listRequests() {
    return demoClients().flatMap((c) => c.requests).sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async updateRequest(id, patch) {
    const s = demoState();
    s.reqs[id] = { ...s.reqs[id], ...patch, updated_at: new Date().toISOString() };
    saveDemo(s);
    return {};
  },
  async setPipeline(clientId, patch) {
    const s = demoState();
    const cur = demoClients().find((c) => c.user_id === clientId);
    const base: Pipe = s.pipes[clientId] || { client_id: clientId, stage: cur?.stage || "new", assigned_to: cur?.assigned_to || null };
    s.pipes[clientId] = { ...base, ...patch };
    saveDemo(s);
    return {};
  },
  async addNote(clientId, body) {
    const s = demoState();
    const note: Note = { id: String(Date.now()), client_id: clientId, author_id: "staff-john", body, created_at: new Date().toISOString() };
    s.notes.push(note);
    saveDemo(s);
    return { note };
  },
  async deleteNote(id) {
    const s = demoState();
    s.notes = s.notes.filter((n) => n.id !== id);
    saveDemo(s);
    return {};
  },
  async listStaff() {
    return DEMO_STAFF;
  },
  async fileUrl(path) {
    return path.startsWith("data:") ? path : null;
  },
};

export const admin: AdminBackend = IS_DEMO ? demo : live;
