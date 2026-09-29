import { json, preflight } from "@/lib/cors";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Website forms (contact, free-call request, newsletter, city quiz, order requests) → website_leads.
// Uses the public key: the database only lets the public add a new lead, never read one (see 0006_website.sql).
const KINDS = ["contact", "consultation", "newsletter", "quiz", "order_request"];
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "") || null;

export const OPTIONS = preflight;

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return json(request, { error: "bad_request" }, 400);
  // Spam trap: the hidden "website" field is empty for people and filled in by most bots. Pretend it worked.
  if (typeof b.website === "string" && b.website.trim()) return json(request, { ok: true });

  const kind = String(b.kind || "");
  const email = clip(b.email, 320)?.toLowerCase();
  if (!KINDS.includes(kind)) return json(request, { error: "bad_kind" }, 400);
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(request, { error: "bad_email" }, 400);
  const data = b.data && typeof b.data === "object" ? b.data : {};
  if (JSON.stringify(data).length > 6000) return json(request, { error: "too_large" }, 400);

  const row = {
    kind,
    email,
    name: clip(b.name, 200),
    phone: clip(b.phone, 60),
    message: clip(b.message, 5000),
    page: clip(b.page, 300),
    data,
  };
  if (!SUPABASE_URL || !SUPABASE_KEY) return json(request, { ok: true, demo: true });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/website_leads`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) return json(request, { error: "save_failed" }, 502);
  return json(request, { ok: true });
}
