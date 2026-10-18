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

export type MailButton = { label: string; url: string; primary?: boolean };
export type MailRow = [label: string, value: string | null | undefined, showIfEmpty?: boolean];

const stamp = () =>
  new Date().toLocaleString("en-GB", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) +
  " (Vietnam time)";

/** WhatsApp link for a phone number typed on the website, or null when it has too few digits to be a number. */
export const whatsappUrl = (phone: string | null | undefined) => {
  const d = (phone || "").replace(/\D/g, "");
  return d.length >= 8 && d.length <= 15 ? `https://wa.me/${d}` : null;
};

/** A staff notification: header bar, what happened and when, the details, the message in its own box, then action buttons.
 *  Table layout and inline styles only, so it looks the same in Zoho, Gmail and Outlook. */
export function staffMail(m: {
  eyebrow: string; title: string; preview?: string; rows: MailRow[]; message?: string | null; buttons: MailButton[];
  /** Wording under the title, the footer line, and extra content (already escaped HTML plus a plain-text version) below the buttons. */
  intro?: string; footer?: string; extraHtml?: string; extraText?: string; stampLabel?: string;
}) {
  const rows = m.rows.filter(([, v, always]) => (v && String(v).trim()) || always) as [string, string | null | undefined, boolean?][];
  const when = stamp();
  const rowHtml = rows
    .map(([k, v]) => {
      const has = v && String(v).trim();
      return (
        `<tr><td style="padding:9px 16px 9px 0;width:150px;color:#6b7a8a;font-size:13px;vertical-align:top;border-bottom:1px solid #eef1f5">${esc(k)}</td>` +
        `<td style="padding:9px 0;font-size:15px;line-height:1.45;vertical-align:top;border-bottom:1px solid #eef1f5;white-space:pre-wrap;color:${has ? "#090825" : "#9aa5b1"}">${has ? esc(v) : "Not provided"}</td></tr>`
      );
    })
    .join("");
  const msgHtml = m.message && m.message.trim()
    ? `<p style="margin:24px 0 8px;font-size:13px;color:#6b7a8a">Message</p>` +
      `<div style="padding:14px 16px;background:#f5f7fa;border-left:4px solid #FF2D3B;border-radius:4px;font-size:15px;line-height:1.55;white-space:pre-wrap;color:#090825">${esc(m.message.trim())}</div>`
    : "";
  const btnHtml = m.buttons
    .map((b) =>
      b.primary
        ? `<a href="${esc(b.url)}" style="display:inline-block;margin:0 10px 10px 0;background:#FF2D3B;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:999px;font-weight:bold;font-size:15px">${esc(b.label)}</a>`
        : `<a href="${esc(b.url)}" style="display:inline-block;margin:0 10px 10px 0;background:#ffffff;color:#090825;text-decoration:none;padding:11px 21px;border:1px solid #090825;border-radius:999px;font-weight:bold;font-size:15px">${esc(b.label)}</a>`,
    )
    .join("");
  const html =
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(m.preview || m.title)}</div>` +
    `<div style="background:#f5f7fa;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#090825">` +
    `<table role="presentation" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse;background:#ffffff;border-radius:8px;overflow:hidden">` +
    `<tr><td style="background:#090825;padding:16px 28px;color:#ffffff;font-size:17px;font-weight:bold;letter-spacing:.3px">XploreVietnam</td></tr>` +
    `<tr><td style="padding:28px 28px 8px">` +
    `<p style="margin:0 0 6px;font-size:12px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;color:#FF2D3B">${esc(m.eyebrow)}</p>` +
    `<h1 style="margin:0 0 6px;font-size:22px;line-height:1.25">${esc(m.title)}</h1>` +
    `<p style="margin:0 0 ${m.intro ? "10" : "20"}px;font-size:13px;color:#6b7a8a">${esc(m.stampLabel || "Received")} ${esc(when)}</p>` +
    (m.intro ? `<p style="margin:0 0 18px;font-size:15px;line-height:1.55;color:#090825">${esc(m.intro)}</p>` : "") +
    `<table role="presentation" style="width:100%;border-collapse:collapse;border-top:1px solid #eef1f5">${rowHtml}</table>` +
    msgHtml +
    `<p style="margin:26px 0 0">${btnHtml}</p>` +
    (m.extraHtml || "") +
    `</td></tr>` +
    `<tr><td style="padding:12px 28px 24px;font-size:12px;color:#9aa5b1">${esc(m.footer || "Sent automatically by xplorevietnam.org when someone fills in a form. Reply to this email to answer the person directly.")}</td></tr>` +
    `</table></div>`;
  const text =
    `${m.eyebrow.toUpperCase()}\n${m.title}\n${m.stampLabel || "Received"} ${when}\n${m.intro ? `\n${m.intro}\n` : ""}\n` +
    rows.map(([k, v]) => `${k}: ${v && String(v).trim() ? v : "Not provided"}`).join("\n") +
    (m.message && m.message.trim() ? `\n\nMessage:\n${m.message.trim()}` : "") +
    `\n\n${m.buttons.map((b) => `${b.label}: ${b.url}`).join("\n")}` +
    (m.extraText ? `\n\n${m.extraText}` : "");
  return { html, text };
}
