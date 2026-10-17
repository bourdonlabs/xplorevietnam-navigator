// Partner coupon codes, checked on the server with the public key. The database functions (0007_partner_program.sql)
// answer only "is this an active partner's code, and what discount does it give", so no secret key is needed here.
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

export type PartnerCode = { id: string; code: string; discount: number };

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/** Upper-case letters and digits only, max 20: the same shape the database stores. */
export const cleanCode = (v: unknown) => (typeof v === "string" ? v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) : "");
export const cleanUsername = (v: unknown) => (typeof v === "string" ? v.trim().toLowerCase().slice(0, 30) : "");

/** The partner behind a coupon code, or null if the code is unknown or suspended. */
export async function lookupCode(raw: unknown): Promise<PartnerCode | null> {
  const code = cleanCode(raw);
  if (code.length < 3) return null;
  const rows = await rpc<{ id: string; code: string; customer_discount: number | string }[]>("partner_by_code", { p_code: code });
  const r = rows?.[0];
  return r ? { id: r.id, code: r.code, discount: Number(r.customer_discount) } : null;
}

/** Counts one click on a partner link. Unknown codes are ignored by the database. */
export const trackVisit = (code: string, page: string) => rpc("track_partner_visit", { p_code: code, p_page: page.slice(0, 300) });

/** Is this username and coupon code still free? Null if the database could not be reached. */
export const checkAvailable = (username: string, code: string) =>
  rpc<{ username_ok: boolean; code_ok: boolean }>("partner_available", { p_username: username, p_code: code });
