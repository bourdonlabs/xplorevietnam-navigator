import type Stripe from "stripe";
import { signedAgreementHtml, signedAgreementText, type Section } from "./agreements";
import { NOTIFY_TO, sendEmail, staffMail, whatsappUrl, type MailButton } from "./mailer";
import { orderRef } from "./order-summary";
import type { CartLine } from "./shop";

type SignedRow = {
  id: string; title: string; version: string; created_at: string; signer_name: string; signer_email: string;
  body: { title: string; subtitle: string; sections: Section[] };
};

const usd = (n: number) => "$" + n.toLocaleString("en-US");
const money = (cents: number | null | undefined) => usd(Math.round((cents || 0)) / 100);
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " UTC";

/** After a website order is paid: a receipt with the signed agreement(s) to the customer, and an alert to the team. */
export async function mailPaidOrder(o: { session: Stripe.Checkout.Session; lines: CartLine[]; agreements: SignedRow[]; origin: string; orderId?: string | null }) {
  const { session, lines, agreements, origin } = o;
  const c = session.customer_details;
  const email = c?.email || agreements[0]?.signer_email || "";
  const name = c?.name || agreements[0]?.signer_name || "";
  const first = name.split(" ")[0];
  const paid = money(session.amount_total);
  const balance = lines.reduce((s, l) => s + ((l.price || 0) - Math.round((l.price || 0) * l.deposit)), 0);
  const items = lines
    .map((l) => `${l.name}${l.options.visa_type ? ` (${l.options.visa_type})` : ""}${l.dependents ? ` + ${l.dependents} dependent${l.dependents > 1 ? "s" : ""}` : ""}${l.addons.length ? ` + ${l.addons.map((a) => a.name).join(", ")}` : ""}`)
    .join("\n");
  const ref = orderRef(session.id);

  if (email) {
    const extraHtml = agreements
      .map((a) => signedAgreementHtml(a.body, { name: a.signer_name, email: a.signer_email, signedAt: when(a.created_at), version: a.version, id: a.id }))
      .join("");
    const extraText = agreements.map((a) => signedAgreementText(a.body, { name: a.signer_name, email: a.signer_email, signedAt: when(a.created_at), version: a.version, id: a.id })).join("\n\n----\n\n");
    const { html, text } = staffMail({
      eyebrow: "Payment received",
      title: first ? `Thank you, ${first}. Your order is confirmed.` : "Thank you. Your order is confirmed.",
      preview: `We received your payment of ${paid}. Your signed agreement is inside.`,
      intro: "We have received your payment and will be in touch shortly with the next steps. Your signed agreement is below, so you can keep it for your records.",
      stampLabel: "Paid",
      rows: [
        ["Order", items],
        ["Paid today", paid],
        ["Due after filing", balance > 0 ? `${usd(balance)} (we will send you a secure payment link)` : null],
        ["Reference", ref],
      ],
      buttons: [{ label: "Questions? Email us", url: `mailto:${NOTIFY_TO[0] || "info@xplorevietnam.org"}?subject=${encodeURIComponent(`Order ${ref}`)}`, primary: true }],
      footer: "You are receiving this because you placed an order at xplorevietnam.org. Reply to this email if you have any questions.",
      extraHtml,
      extraText,
    });
    await sendEmail({ to: email, subject: `Your XploreVietnam order is confirmed (${ref})`, html, text, replyTo: NOTIFY_TO[0] });
  }

  const wa = whatsappUrl(c?.phone);
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const buttons: MailButton[] = [
    { label: "Open orders in Navigator", url: `${origin}/admin/orders`, primary: true },
    ...(email ? [{ label: first ? `Reply to ${first}` : "Reply", url: `mailto:${email}` }] : []),
    ...(wa ? [{ label: "WhatsApp", url: wa }] : []),
    ...(pi ? [{ label: "View payment in Stripe", url: `https://dashboard.stripe.com/${session.livemode ? "" : "test/"}payments/${pi}` }] : []),
  ];
  const { html, text } = staffMail({
    eyebrow: session.livemode ? "New paid order" : "New paid order (TEST MODE)",
    title: `${name || email || "A customer"} paid ${paid}`,
    preview: `${paid} received. ${lines.length} item${lines.length > 1 ? "s" : ""}.`,
    stampLabel: "Paid",
    rows: [
      ["Name", name, true],
      ["Email", email, true],
      ["WhatsApp / phone", c?.phone],
      ["Items", items, true],
      ["Paid today", paid, true],
      ["Balance due after filing", balance > 0 ? `${usd(balance)} (send the customer a payment link)` : "None"],
      ["Partner code", session.metadata?.partner_code],
      ["Agreements signed", agreements.length ? agreements.map((a) => `${a.title} (${a.version})`).join("\n") : "None recorded", true],
      ["Reference", ref],
    ],
    buttons,
    footer: "Sent automatically when a website order is paid. The signed agreements are stored in the signed_agreements table in Supabase and a copy was emailed to the customer.",
  });
  await sendEmail({ to: NOTIFY_TO, subject: `${session.livemode ? "" : "[TEST] "}New paid order: ${name || email} (${paid})`, html, text, replyTo: email || undefined });
}
