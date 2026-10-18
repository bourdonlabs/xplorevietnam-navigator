// Sends email through Resend (https://resend.com) with a plain fetch, so there is no extra package to install.
// Email is a side effect: if it is not set up or a send fails, the website form or approval still works.
//   RESEND_API_KEY  required to send anything
//   MAIL_FROM       e.g. "XploreVietnam <notifications@xplorevietnam.org>" (the domain must be verified in Resend)
//   NOTIFY_TO       where staff notifications go (comma-separate several); defaults to info@xplorevietnam.org

const FROM = process.env.MAIL_FROM || "XploreVietnam <notifications@xplorevietnam.org>";

export const NOTIFY_TO = (process.env.NOTIFY_TO || "info@xplorevietnam.org")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export const esc = (v: unknown) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

export async function sendEmail(m: { to: string | string[]; subject: string; html: string; text: string; replyTo?: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: m.to, subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("email_failed", res.status, await res.text().catch(() => ""));
    return res.ok;
  } catch (e) {
    console.error("email_failed", e);
    return false;
  }
}

/** A simple, plain staff email: a title, label/value rows and an optional button. Inline styles so mail apps show it. */
export function staffMail(title: string, rows: [string, string | null | undefined][], button?: { label: string; url: string }) {
  const shown = rows.filter(([, v]) => v && String(v).trim()) as [string, string][];
  const html =
    `<div style="font-family:Arial,Helvetica,sans-serif;color:#090825;max-width:560px">` +
    `<h2 style="margin:0 0 16px;font-size:20px">${esc(title)}</h2>` +
    `<table style="border-collapse:collapse;width:100%">` +
    shown
      .map(
        ([k, v]) =>
          `<tr><td style="padding:8px 12px 8px 0;color:#6b7a8a;font-size:14px;vertical-align:top;white-space:nowrap">${esc(k)}</td>` +
          `<td style="padding:8px 0;font-size:15px;white-space:pre-wrap">${esc(v)}</td></tr>`,
      )
      .join("") +
    `</table>` +
    (button
      ? `<p style="margin:24px 0 0"><a href="${esc(button.url)}" style="background:#FF2D3B;color:#fff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;font-size:15px">${esc(button.label)}</a></p>`
      : "") +
    `</div>`;
  const text = `${title}\n\n${shown.map(([k, v]) => `${k}: ${v}`).join("\n")}${button ? `\n\n${button.label}: ${button.url}` : ""}`;
  return { html, text };
}
