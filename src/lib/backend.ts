"use client";
// One interface, two implementations:
//  - Supabase (real accounts, confirmation emails, data in Postgres behind RLS)
//  - Demo (no keys set): the same flow, stored in this browser only, so the UI can be reviewed before the backend exists.
import { IS_DEMO } from "./supabase/env";
import { supabaseBrowser } from "./supabase/client";

export type User = { id: string; email: string };

export type Profile = {
  user_id: string;
  email?: string | null;
  first_name: string | null;
  last_name: string | null;
  nationality: string | null;
  country_of_residence: string | null;
  move_stage: string | null;
  anticipated_move_date: string | null; // yyyy-mm-dd, anchors the journey dates
  visa_type: string | null;
  has_sponsor: boolean | null;
  sponsor_type: string | null;
  onboarded_at: string | null;
  destination_city?: string | null;
};

export type Dependent = { id: string; full_name: string; created_at: string };

export type UploadedDoc = {
  id: string;
  applicant_id: string | null; // null = main applicant
  doc_key: string;
  file_path: string;
  file_name: string;
  size_bytes: number;
  created_at: string;
};

export type ServiceRequest = {
  id: string;
  service: string;
  quantity: number;
  dependents: number;
  amount_usd: number;
  status: string;
  created_at: string;
};

type Result = { error?: string };

const uid4 = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random());
const safeName = (n: string) => n.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(-80);

// Demo mode can't store files, so it keeps them in memory for this tab to allow previewing.
const demoFiles = new Map<string, string>();

const store = {
  get<T>(k: string, fallback: T): T {
    try {
      const v = window.localStorage.getItem(k);
      return v ? (JSON.parse(v) as T) : fallback;
    } catch {
      return fallback;
    }
  },
  set(k: string, v: unknown) {
    try {
      window.localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* private mode: demo state lives only in memory */
    }
  },
  del(k: string) {
    try {
      window.localStorage.removeItem(k);
    } catch {}
  },
};

const listeners = new Set<(u: User | null) => void>();
const emit = (u: User | null) => listeners.forEach((l) => l(u));

const demo = {
  async getUser(): Promise<User | null> {
    return store.get<User | null>("xv-demo-user", null);
  },
  onAuthChange(cb: (u: User | null) => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  async signUp(email: string): Promise<Result> {
    store.set("xv-demo-pending", email);
    return {};
  },
  async signIn(email: string): Promise<Result> {
    const u = { id: "demo-" + email.toLowerCase(), email };
    store.set("xv-demo-user", u);
    emit(u);
    return {};
  },
  async signOut() {
    store.del("xv-demo-user");
    emit(null);
  },
  async sendReset(): Promise<Result> {
    return {};
  },
  async getProfile(uid: string): Promise<Profile | null> {
    return store.get<Profile | null>("xv-demo-profile-" + uid, null);
  },
  async saveProfile(uid: string, patch: Partial<Profile>): Promise<Result> {
    const cur = store.get<Partial<Profile>>("xv-demo-profile-" + uid, {});
    store.set("xv-demo-profile-" + uid, { ...cur, ...patch, user_id: uid });
    return {};
  },
  async getProgress(uid: string): Promise<number[]> {
    return store.get<number[]>("xv-demo-progress-" + uid, []);
  },
  async setItemDone(uid: string, itemId: number, done: boolean) {
    const cur = new Set(store.get<number[]>("xv-demo-progress-" + uid, []));
    if (done) cur.add(itemId);
    else cur.delete(itemId);
    store.set("xv-demo-progress-" + uid, [...cur]);
  },

  async listDependents(uid: string): Promise<Dependent[]> {
    return store.get<Dependent[]>("xv-demo-deps-" + uid, []);
  },
  async addDependent(uid: string, full_name: string): Promise<Dependent | null> {
    const d = { id: uid4(), full_name, created_at: new Date().toISOString() };
    store.set("xv-demo-deps-" + uid, [...store.get<Dependent[]>("xv-demo-deps-" + uid, []), d]);
    return d;
  },
  async renameDependent(uid: string, id: string, full_name: string) {
    store.set("xv-demo-deps-" + uid, store.get<Dependent[]>("xv-demo-deps-" + uid, []).map((d) => (d.id === id ? { ...d, full_name } : d)));
  },
  async removeDependent(uid: string, id: string) {
    store.set("xv-demo-deps-" + uid, store.get<Dependent[]>("xv-demo-deps-" + uid, []).filter((d) => d.id !== id));
    store.set("xv-demo-docs-" + uid, store.get<UploadedDoc[]>("xv-demo-docs-" + uid, []).filter((d) => d.applicant_id !== id));
  },
  async listDocs(uid: string): Promise<UploadedDoc[]> {
    return store.get<UploadedDoc[]>("xv-demo-docs-" + uid, []);
  },
  async uploadDoc(uid: string, applicantId: string | null, docKey: string, file: File): Promise<{ doc?: UploadedDoc; error?: string }> {
    const doc: UploadedDoc = {
      id: uid4(),
      applicant_id: applicantId,
      doc_key: docKey,
      file_path: `${uid}/visa/${applicantId || "main"}/${docKey}/${Date.now()}-${safeName(file.name)}`,
      file_name: file.name,
      size_bytes: file.size,
      created_at: new Date().toISOString(),
    };
    demoFiles.set(doc.id, URL.createObjectURL(file));
    store.set("xv-demo-docs-" + uid, [...store.get<UploadedDoc[]>("xv-demo-docs-" + uid, []), doc]);
    return { doc };
  },
  async removeDoc(uid: string, doc: UploadedDoc) {
    store.set("xv-demo-docs-" + uid, store.get<UploadedDoc[]>("xv-demo-docs-" + uid, []).filter((d) => d.id !== doc.id));
  },
  async docUrl(doc: UploadedDoc): Promise<string | null> {
    return demoFiles.get(doc.id) || null;
  },
  async listRequests(uid: string): Promise<ServiceRequest[]> {
    return store.get<ServiceRequest[]>("xv-demo-req-" + uid, []);
  },
  async createRequest(uid: string, service: string, dependents: number, amount_usd: number, quantity = 1): Promise<Result> {
    const r = { id: uid4(), service, quantity, dependents, amount_usd, status: "requested", created_at: new Date().toISOString() };
    store.set("xv-demo-req-" + uid, [...store.get<ServiceRequest[]>("xv-demo-req-" + uid, []), r]);
    return {};
  },
};

const live = {
  async getUser(): Promise<User | null> {
    const { data } = await supabaseBrowser().auth.getUser();
    return data.user ? { id: data.user.id, email: data.user.email || "" } : null;
  },
  onAuthChange(cb: (u: User | null) => void) {
    const { data } = supabaseBrowser().auth.onAuthStateChange((_e, s) =>
      cb(s?.user ? { id: s.user.id, email: s.user.email || "" } : null),
    );
    return () => data.subscription.unsubscribe();
  },
  async signUp(email: string, password: string): Promise<Result> {
    const { data, error } = await supabaseBrowser().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) return { error: error.message };
    // Supabase returns a user with no identities when the email is already registered.
    if (data.user && data.user.identities?.length === 0)
      return { error: "An account with this email already exists. Log in instead." };
    return {};
  },
  async signIn(email: string, password: string): Promise<Result> {
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    return error ? { error: error.message } : {};
  },
  async signOut() {
    await supabaseBrowser().auth.signOut();
  },
  async sendReset(email: string): Promise<Result> {
    const { error } = await supabaseBrowser().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/auth/reset`,
    });
    return error ? { error: error.message } : {};
  },
  async getProfile(uid: string): Promise<Profile | null> {
    const { data } = await supabaseBrowser().from("profiles").select("*").eq("user_id", uid).maybeSingle();
    return (data as Profile) || null;
  },
  async saveProfile(uid: string, patch: Partial<Profile>): Promise<Result> {
    const { error } = await supabaseBrowser()
      .from("profiles")
      .upsert({ ...patch, user_id: uid }, { onConflict: "user_id" });
    return error ? { error: error.message } : {};
  },
  async getProgress(uid: string): Promise<number[]> {
    const { data } = await supabaseBrowser().from("journey_progress").select("item_id").eq("user_id", uid);
    return (data || []).map((r: { item_id: number }) => r.item_id);
  },
  async setItemDone(uid: string, itemId: number, done: boolean) {
    const db = supabaseBrowser().from("journey_progress");
    if (done) await db.upsert({ user_id: uid, item_id: itemId }, { onConflict: "user_id,item_id" });
    else await db.delete().eq("user_id", uid).eq("item_id", itemId);
  },

  async listDependents(uid: string): Promise<Dependent[]> {
    const { data } = await supabaseBrowser().from("dependents").select("id, full_name, created_at").eq("user_id", uid).order("created_at");
    return (data as Dependent[]) || [];
  },
  async addDependent(uid: string, full_name: string): Promise<Dependent | null> {
    const { data } = await supabaseBrowser().from("dependents").insert({ user_id: uid, full_name }).select("id, full_name, created_at").single();
    return (data as Dependent) || null;
  },
  async renameDependent(_uid: string, id: string, full_name: string) {
    await supabaseBrowser().from("dependents").update({ full_name }).eq("id", id);
  },
  async removeDependent(uid: string, id: string) {
    const db = supabaseBrowser();
    const { data } = await db.from("visa_documents").select("file_path").eq("applicant_id", id);
    if (data?.length) await db.storage.from("client-docs").remove(data.map((d: { file_path: string }) => d.file_path));
    await db.from("dependents").delete().eq("id", id); // documents rows cascade
  },
  async listDocs(uid: string): Promise<UploadedDoc[]> {
    const { data } = await supabaseBrowser()
      .from("visa_documents")
      .select("id, applicant_id, doc_key, file_path, file_name, size_bytes, created_at")
      .eq("user_id", uid)
      .order("created_at");
    return (data as UploadedDoc[]) || [];
  },
  async uploadDoc(uid: string, applicantId: string | null, docKey: string, file: File): Promise<{ doc?: UploadedDoc; error?: string }> {
    const db = supabaseBrowser();
    const path = `${uid}/visa/${applicantId || "main"}/${docKey}/${Date.now()}-${safeName(file.name)}`;
    const up = await db.storage.from("client-docs").upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) return { error: up.error.message };
    const { data, error } = await db
      .from("visa_documents")
      .insert({ user_id: uid, applicant_id: applicantId, doc_key: docKey, file_path: path, file_name: file.name, size_bytes: file.size })
      .select("id, applicant_id, doc_key, file_path, file_name, size_bytes, created_at")
      .single();
    if (error) {
      await db.storage.from("client-docs").remove([path]);
      return { error: error.message };
    }
    return { doc: data as UploadedDoc };
  },
  async removeDoc(_uid: string, doc: UploadedDoc) {
    const db = supabaseBrowser();
    await db.from("visa_documents").delete().eq("id", doc.id);
    await db.storage.from("client-docs").remove([doc.file_path]);
  },
  async docUrl(doc: UploadedDoc): Promise<string | null> {
    const { data } = await supabaseBrowser().storage.from("client-docs").createSignedUrl(doc.file_path, 120);
    return data?.signedUrl || null;
  },
  async listRequests(uid: string): Promise<ServiceRequest[]> {
    const { data } = await supabaseBrowser()
      .from("service_requests")
      .select("id, service, quantity, dependents, amount_usd, status, created_at")
      .eq("user_id", uid)
      .order("created_at");
    return (data as ServiceRequest[]) || [];
  },
  async createRequest(uid: string, service: string, dependents: number, amount_usd: number, quantity = 1): Promise<Result> {
    const { error } = await supabaseBrowser().from("service_requests").insert({ user_id: uid, service, quantity, dependents, amount_usd });
    return error ? { error: error.message } : {};
  },
};

export const backend = { demo: IS_DEMO, ...(IS_DEMO ? demo : live) };
