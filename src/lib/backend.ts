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
};

type Result = { error?: string };

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
};

export const backend = { demo: IS_DEMO, ...(IS_DEMO ? demo : live) };
