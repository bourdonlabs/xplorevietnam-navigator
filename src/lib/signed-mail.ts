import { NOTIFY_TO, sendEmail, staffMail } from "./mailer";
import { viewUrl } from "./signed-link";
import { auditSerial, documentId, signedAgreementPdf, type SignedAgreementRow } from "./signed-pdf";

const fileName = (title: string) => (title.replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "Agreement") + "-signed.pdf";
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " UTC";

/** Sent right after someone e-signs an agreement: the signed PDF attached, and a button that opens the same PDF online. */
export async function mailSignedAgreement(row: SignedAgreementRow, origin: string) {
  const url = viewUrl(origin, row.id);
  const pdf = await signedAgreementPdf(row, { viewUrl: url });
  const { html, text } = staffMail({
    eyebrow: "Document signed",
    title: "Your document was signed",
    preview: `Your signed copy of "${row.title}" is attached.`,
    stampLabel: "Sent",
    intro: `Thank you. You signed "${row.title}" on ${when(row.created_at)}. The signed copy (PDF) is attached to this email${url ? ", and you can open it online with the button below" : ""}.`,
    rows: [
      ["Document", row.title],
      ["Signed by", row.signer_name],
      ["Signed on", when(row.created_at)],
      ["Document ID", documentId(row)],
      ["Audit Trail Serial#", auditSerial(row)],
    ],
    buttons: url ? [{ label: "View Signed Document", url, primary: true }] : [],
    footer:
      "Please keep this email and the attached PDF for your records. Do not forward this email: the button opens your signed document. " +
      "You are receiving this because this email address was used to sign an agreement at xplorevietnam.org. If that was not you, reply to this email and let us know.",
  });
  return sendEmail({
    to: row.signer_email,
    subject: `Your signed agreement: ${row.title}`,
    html,
    text,
    replyTo: NOTIFY_TO[0],
    attachments: [{ filename: fileName(row.title), content: Buffer.from(pdf).toString("base64") }],
  });
}
