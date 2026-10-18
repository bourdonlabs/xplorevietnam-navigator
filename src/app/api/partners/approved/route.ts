import { json, preflight } from "@/lib/cors";
import { esc, sendEmail } from "@/lib/mailer";
import { shareLink } from "@/lib/partner-program";
import { supabaseServer } from "@/lib/supabase/server";

// Emails a partner that their application was approved. Called by the admin Applications tab right after Approve.
// Only staff can call it, and it only sends when the partner really is active in the database.
export const OPTIONS = preflight;

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as { partnerId?: unknown } | null;
  const id = typeof b?.partnerId === "string" ? b.partnerId : "";
  if (!id) return json(request, { error: "bad_request" }, 400);

  const db = await supabaseServer();
  const staff = await db.rpc("is_staff");
  if (staff.error || staff.data !== true) return json(request, { error: "staff_only" }, 403);

  const { data: p } = await db
    .from("partners")
    .select("name, username, code, email, status, commission_rate, customer_discount")
    .eq("id", id)
    .maybeSingle();
  if (!p || p.status !== "active" || !p.email) return json(request, { error: "not_sent" }, 409);

  const first = (p.name || p.username || "").split(" ")[0];
  const discount = Math.round(Number(p.customer_discount) * 100);
  const rate = Math.round(Number(p.commission_rate) * 100);
  const link = shareLink(p.code);
  const base = new URL(request.url).origin;
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;color:#090825;max-width:560px;line-height:1.55">` +
    `<h2 style="margin:0 0 16px;font-size:22px">You are approved, ${esc(first)}</h2>` +
    `<p>Welcome to the XploreVietnam partner program. Your application was reviewed and your coupon code and link are live.</p>` +
    `<table style="border-collapse:collapse;margin:16px 0">` +
    `<tr><td style="padding:6px 16px 6px 0;color:#6b7a8a">Your coupon code</td><td style="padding:6px 0"><b>${esc(p.code)}</b></td></tr>` +
    `<tr><td style="padding:6px 16px 6px 0;color:#6b7a8a">Your link</td><td style="padding:6px 0"><a href="${esc(link)}">${esc(link)}</a></td></tr>` +
    (discount > 0 ? `<tr><td style="padding:6px 16px 6px 0;color:#6b7a8a">Your customers get</td><td style="padding:6px 0">${discount}% off</td></tr>` : "") +
    (rate > 0 ? `<tr><td style="padding:6px 16px 6px 0;color:#6b7a8a">You earn</td><td style="padding:6px 0">${rate}% commission on each paid order</td></tr>` : "") +
    `</table>` +
    `<p>Log in to see your visits, sales and earnings, and to set how you want to be paid.</p>` +
    `<p style="margin:24px 0"><a href="${esc(base)}/partner" style="background:#FF2D3B;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold">Open my partner dashboard</a></p>` +
    `<p style="color:#6b7a8a;font-size:14px">Questions? Reply to this email or write to info@xplorevietnam.org.</p></div>`;
  const text =
    `You are approved, ${first}\n\nWelcome to the XploreVietnam partner program. Your coupon code and link are live.\n\n` +
    `Coupon code: ${p.code}\nYour link: ${link}\n${discount > 0 ? `Your customers get: ${discount}% off\n` : ""}${rate > 0 ? `You earn: ${rate}% commission on each paid order\n` : ""}\n` +
    `Your dashboard: ${base}/partner\n\nQuestions? Reply to this email or write to info@xplorevietnam.org.`;
  const ok = await sendEmail({ to: p.email, subject: "You are approved: XploreVietnam partner program", html, text, replyTo: "info@xplorevietnam.org" });
  return ok ? json(request, { ok: true }) : json(request, { error: "not_sent" }, 502);
}
