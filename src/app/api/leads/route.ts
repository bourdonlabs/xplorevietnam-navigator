import { after } from "next/server";
import { json, preflight } from "@/lib/cors";
import { NOTIFY_TO, sendEmail, staffMail } from "@/lib/mailer";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Website forms (contact, free-call request, newsletter, city quiz, order requests) → website_leads.
// Uses the public key: the database only lets the public add a new lead, never read one (see 0006_website.sql).
const KINDS = ["contact", "consultation", "newsletter", "quiz", "order_request"];
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "") || null;

export const OPTIONS = preflight;

const LABEL: Record<string, string> = {
  contact: "New message",
  consultation: "New free call request",
  quiz: "New city quiz lead",
  order_request: "New order or quote request",
};

type Row = { kind: string; email: string; name: string | null; phone: string | null; message: string | null; page: string | null; data: Record<string, unknown> };

// Tells the team about a new lead. Newsletter sign-ups are left out: they are too frequent to be worth an email each.
async function notifyTeam(r: Row, origin: string) {
  if (!LABEL[r.kind]) return;
  const d = r.data;
  const company = d.company && typeof d.company === "object" ? (d.company as { structure?: string; selling?: string }) : null;
  const items = Array.isArray(d.items)
    ? (d.items as { name?: string; dependents?: number; price?: number | null }[])
        .map((i) => `${i.name}${i.dependents ? ` + ${i.dependents} dependent(s)` : ""} (${i.price == null ? "quote needed" : "$" + i.price})`)
        .join("\n")
    : "";
  const { html, text } = staffMail(
    `${LABEL[r.kind]}${r.name ? `: ${r.name}` : ""}`,
    [
      ["Name", r.name],
      ["Email", r.email],
      ["WhatsApp / phone", r.phone],
      ["Items", items],
      ["Company structure", company?.structure],
      ["Will sell", company?.selling],
      ["Needs help with", typeof d.interest === "string" ? d.interest : null],
      ["Best time", typeof d.preferred_time === "string" ? d.preferred_time : null],
      ["Quiz result", typeof d.result === "string" ? d.result : null],
      ["Message", r.message],
      ["From page", r.page],
    ],
    { label: "Open in Navigator", url: `${origin}/admin/leads` },
  );
  await sendEmail({ to: NOTIFY_TO, subject: `${LABEL[r.kind]}${r.name ? `: ${r.name}` : ` (${r.email})`}`, html, text, replyTo: r.email });
}

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

  const row: Row = {
    kind,
    email,
    name: clip(b.name, 200),
    phone: clip(b.phone, 60),
    message: clip(b.message, 5000),
    page: clip(b.page, 300),
    data: data as Record<string, unknown>,
  };
  if (!SUPABASE_URL || !SUPABASE_KEY) return json(request, { ok: true, demo: true });

  const res = await fetch(`${SUPABASE_URL}/rest/v1/website_leads`, {
    method: "POST",
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
    body: JSON.stringify(row),
  });
  if (!res.ok) return json(request, { error: "save_failed" }, 502);
  after(() => notifyTeam(row, new URL(request.url).origin));
  return json(request, { ok: true });
}
