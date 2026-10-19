// The signed copy of an agreement as a PDF: the full text as it was shown, a signature page, and a signature
// certificate with the audit trail. Built from the signed_agreements row alone, so the same row always gives the same
// document (the email attachment and the "View Signed Document" link are identical).
//
// Server-side only. pdf-lib draws the pages; the fonts are embedded from pdf-fonts.ts because Vercel functions have
// no font files to read from disk.
import { createHash } from "node:crypto";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import QRCode from "qrcode";
import { COMPANY, type Block, type Section } from "./agreements";
import { INTER_BOLD_B64, INTER_REGULAR_B64 } from "./pdf-fonts";

export type SignedAgreementRow = {
  id: string;
  created_at: string;
  title: string;
  version: string;
  content_sha256: string;
  cart_hash: string;
  body: { title: string; subtitle: string; sections: Section[] };
  signer_name: string;
  signer_email: string;
  signature_type: string;
  signature_font: string | null;
  signature_image: string | null;
  consent_text: string;
  ip: string | null;
  user_agent: string | null;
};

const h = (s: string, n: number) => createHash("sha256").update(s).digest("hex").slice(0, n);
/** Unique Document ID printed on every page. Worked out from the stored record, so nothing extra is saved. */
export const documentId = (r: SignedAgreementRow) => h(`doc|${r.id}|${r.content_sha256}|${r.cart_hash}|${r.created_at}`, 40);
/** Audit Trail Serial# printed on every page. */
export const auditSerial = (r: SignedAgreementRow) => h(`audit|${r.id}|${r.signer_email}|${r.ip || ""}|${r.created_at}`, 32);

const utc = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " UTC";
const longDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });

const col = (hex: string) => rgb(parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255);
const NAVY = col("#090825");
const RED = col("#FF2D3B");
const INK = col("#1b1b2f");
const GREY = col("#6b7a8a");
const LINE = col("#d9dee5");
const SOFT = col("#f2f4f7");
const WHITE = col("#ffffff");

const W = 595.28;
const H = 841.89;
const MX = 54; // left and right margin
const CW = W - MX * 2;
const TOP = 66; // content starts this far below the top edge (clears the header bar)
const BOTTOM = 92; // and stops this far above the bottom edge (clears the footer)

export async function signedAgreementPdf(row: SignedAgreementRow, opts: { viewUrl?: string | null } = {}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create({ updateMetadata: false });
  pdf.registerFontkit(fontkit);
  const reg = await pdf.embedFont(Buffer.from(INTER_REGULAR_B64, "base64"), { subset: true });
  const bold = await pdf.embedFont(Buffer.from(INTER_BOLD_B64, "base64"), { subset: true });
  const known = new Set<number>(reg.getCharacterSet());

  /** Text the font can draw: normalised, control characters gone, anything it has no glyph for shown as "?". */
  const clean = (s: unknown) =>
    Array.from(String(s ?? "").normalize("NFC").replace(/\r/g, "").replace(/\t/g, " "))
      .map((ch) => (ch === "\n" || known.has(ch.codePointAt(0)!) ? ch : "?"))
      .join("");

  const wrap = (text: string, font: PDFFont, size: number, maxW: number): string[] => {
    const out: string[] = [];
    for (const para of clean(text).split("\n")) {
      let line = "";
      for (let w of para.split(/ +/).filter(Boolean)) {
        // A single word wider than the column (a long link or code) is cut where it overflows.
        while (font.widthOfTextAtSize(w, size) > maxW) {
          const chars = Array.from(w);
          let n = chars.length - 1;
          while (n > 1 && font.widthOfTextAtSize(chars.slice(0, n).join(""), size) > maxW) n--;
          if (line) { out.push(line); line = ""; }
          out.push(chars.slice(0, n).join(""));
          w = chars.slice(n).join("");
        }
        const t = line ? `${line} ${w}` : w;
        if (!line || font.widthOfTextAtSize(t, size) <= maxW) line = t;
        else { out.push(line); line = w; }
      }
      out.push(line);
    }
    return out;
  };

  const docId = documentId(row);
  const serial = auditSerial(row);
  const signer = clean(row.signer_name).replace(/\n/g, " ");
  const title = clean(row.title);

  let page!: PDFPage;
  let y = 0;
  let bottom = BOTTOM;
  const newPage = () => {
    page = pdf.addPage([W, H]);
    y = H - TOP;
    bottom = BOTTOM;
  };
  const ensure = (need: number) => { if (y - need < bottom) newPage(); };

  const draw = (s: string, x: number, yy: number, size: number, font: PDFFont = reg, color = INK) =>
    page.drawText(s, { x, y: yy, size, font, color });
  /** Wrapped paragraph at the cursor; moves the cursor down. */
  const para = (text: string, o: { x?: number; w?: number; size?: number; lh?: number; font?: PDFFont; color?: ReturnType<typeof col>; after?: number } = {}) => {
    const size = o.size ?? 9.5;
    const lh = o.lh ?? size * 1.45;
    for (const ln of wrap(text, o.font ?? reg, size, o.w ?? CW)) {
      ensure(lh);
      y -= lh;
      if (ln) draw(ln, o.x ?? MX, y + size * 0.28, size, o.font ?? reg, o.color ?? INK);
    }
    y -= o.after ?? 0;
  };
  const rule = (yy: number, x1 = MX, x2 = W - MX) => page.drawLine({ start: { x: x1, y: yy }, end: { x: x2, y: yy }, thickness: 0.6, color: LINE });

  const block = (b: Block) => {
    if (typeof b === "string") return para(b, { after: 6 });
    if (Array.isArray(b)) {
      for (const item of b) {
        const lh = 9.5 * 1.45;
        ensure(lh);
        draw("•", MX + 4, y - lh + 9.5 * 0.28, 9.5, reg, GREY);
        para(item, { x: MX + 16, w: CW - 16, after: 2.5 });
      }
      y -= 3;
      return;
    }
    ensure(34);
    y -= 6;
    para(b.h3, { font: bold, size: 9.5, after: 2 });
  };

  // ---- Page 1: title and the agreement text -------------------------------------------------
  newPage();
  for (const ln of wrap(title, bold, 19, CW)) {
    y -= 25;
    draw(ln, MX, y + 5, 19, bold, NAVY);
  }
  y -= 2;
  para(clean(row.body.subtitle), { size: 9.5, color: GREY, after: 1 });
  para(`Agreement version ${clean(row.version)}`, { size: 8.5, color: GREY, after: 6 });
  rule(y);
  y -= 4;

  row.body.sections.forEach((sec, i) => {
    ensure(52);
    y -= 12;
    para(`${i + 1}. ${sec.h}`, { font: bold, size: 11.5, lh: 15, after: 4, color: NAVY });
    sec.body.forEach(block);
  });

  // ---- Signature page -----------------------------------------------------------------------
  let sig: PDFImage | null = null;
  try {
    const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(row.signature_image || "");
    if (m) sig = await pdf.embedPng(Buffer.from(m[1], "base64"));
  } catch {
    sig = null;
  }
  const fit = (img: PDFImage, maxW: number, maxH: number) => {
    const k = Math.min(maxW / img.width, maxH / img.height);
    return { width: img.width * k, height: img.height * k };
  };

  const nSig = row.body.sections.length + 1;
  ensure(330);
  y -= 16;
  para(`${nSig}. Signatures`, { font: bold, size: 11.5, lh: 15, after: 4, color: NAVY });
  para("By signing below, each party acknowledges that they have read, understood and agreed to the terms of this agreement.", { after: 10 });

  const half = CW / 2;
  const left = [
    ["Client", true], [`Name: ${signer}`, false], [`Email: ${clean(row.signer_email)}`, false], [`Date: ${longDate(row.created_at)}`, false],
  ] as [string, boolean][];
  const right = [
    [clean(COMPANY.name), true], ["Provider", false], [`Registered address: ${clean(COMPANY.registeredAddress)}`, false], [`Office: ${clean(COMPANY.office)}`, false],
  ] as [string, boolean][];
  const lay = (items: [string, boolean][], w: number) => items.flatMap(([t, b]) => wrap(t, b ? bold : reg, 9, w).map((s) => [s, b] as [string, boolean]));
  const L = lay(left, half - 24);
  const R = lay(right, half - 24);
  const boxH = Math.max(L.length, R.length) * 13 + 22;
  ensure(boxH + 150);
  const top = y;
  page.drawRectangle({ x: MX, y: top - boxH, width: CW, height: boxH, borderColor: LINE, borderWidth: 0.8, color: WHITE });
  page.drawLine({ start: { x: MX + half, y: top }, end: { x: MX + half, y: top - boxH }, thickness: 0.8, color: LINE });
  L.forEach(([s, b], i) => draw(s, MX + 12, top - 19 - i * 13, 9, b ? bold : reg));
  R.forEach(([s, b], i) => draw(s, MX + half + 12, top - 19 - i * 13, 9, b ? bold : reg));
  y = top - boxH - 36;

  if (sig) {
    const d = fit(sig, 230, 64);
    page.drawImage(sig, { x: MX + 22, y: y - d.height + 8, ...d });
    y -= d.height + 4;
  } else {
    y -= 40;
  }
  draw("×", MX + 4, y + 2, 11, reg, GREY);
  page.drawLine({ start: { x: MX + 18, y }, end: { x: MX + 270, y }, thickness: 0.8, color: GREY });
  y -= 14;
  draw(`Signed By ${signer}`, MX + 2, y, 9);
  y -= 13;
  draw(`Signed On: ${longDate(row.created_at)}`, MX + 2, y, 9);
  y -= 13;
  draw(`Signature method: ${row.signature_type === "drawn" ? "drawn on screen" : "typed name"}`, MX + 2, y, 8, reg, GREY);

  // ---- Signature certificate ----------------------------------------------------------------
  newPage();
  bottom = 214; // the QR panel sits at the foot of this page
  y -= 6;
  y -= 24;
  draw("Signature Certificate", MX, y, 21, bold, NAVY);
  y -= 8;
  para(title, { size: 10.5, color: GREY, after: 2 });
  para(`Unique Document ID: ${docId}`, { size: 8.5, color: GREY, after: 14 });

  const boxW = 200;
  const sigTop = y;
  page.drawRectangle({ x: W - MX - boxW, y: sigTop - 82, width: boxW, height: 82, borderColor: LINE, borderWidth: 0.8, color: WHITE });
  draw("Digital Signature:", W - MX - boxW + 12, sigTop - 17, 8, bold, GREY);
  if (sig) {
    const d = fit(sig, boxW - 40, 46);
    page.drawImage(sig, { x: W - MX - boxW + (boxW - d.width) / 2, y: sigTop - 74 + (46 - d.height) / 2, ...d });
  }
  const sx = MX;
  const nameLines = wrap(signer, reg, 14, CW - boxW - 24);
  let sy = sigTop - 20;
  for (const ln of nameLines) { draw(ln, sx, sy, 14, reg, NAVY); sy -= 18; }
  sy += 4;
  for (const ln of wrap(`Signature ID: ${row.id}`, reg, 8.5, CW - boxW - 24)) { sy -= 12; draw(ln, sx, sy, 8.5, reg, GREY); }
  for (const ln of wrap(`Email: ${clean(row.signer_email)}`, reg, 8.5, CW - boxW - 24)) { sy -= 12; draw(ln, sx, sy, 8.5, reg, GREY); }
  sy -= 12; draw(`IP Address: ${clean(row.ip) || "Not recorded"}`, sx, sy, 8.5, reg, GREY);
  for (const ln of wrap("Verification: email address entered at checkout", reg, 8.5, CW - boxW - 24)) { sy -= 12; draw(ln, sx, sy, 8.5, reg, GREY); }
  // A name in a script the embedded font has no glyphs for (for example Chinese) shows as "?" in this PDF; say so, since the signature itself is drawn in the browser and shows the real characters.
  if (Array.from(String(row.signer_name)).some((ch) => !known.has(ch.codePointAt(0)!))) {
    for (const ln of wrap("Note: the name as typed has characters this PDF cannot display. See the signature.", reg, 8.5, CW - boxW - 24)) { sy -= 12; draw(ln, sx, sy, 8.5, reg, GREY); }
  }
  y = Math.min(sigTop - 82, sy) - 22;

  // Fingerprints band
  page.drawRectangle({ x: 0, y: y - 66, width: W, height: 66, color: SOFT });
  draw("Digital Fingerprint Checksum", MX, y - 22, 8, bold, GREY);
  draw("Agreement text (SHA-256)", MX, y - 38, 7.5, reg, GREY);
  draw(clean(row.content_sha256), MX + 138, y - 38, 7.5, reg, INK);
  draw("Items and prices (SHA-256)", MX, y - 52, 7.5, reg, GREY);
  draw(clean(row.cart_hash), MX + 138, y - 52, 7.5, reg, INK);
  y -= 66 + 26;

  // Audit trail
  draw("Timestamp", MX + 8, y, 9, reg, GREY);
  draw("Audit", MX + 170, y, 9, reg, GREY);
  y -= 8;
  rule(y);
  const email = clean(row.signer_email);
  const events: [string, string][] = [
    [utc(row.created_at), `${title} (version ${clean(row.version)}) issued by ${clean(COMPANY.name)} through xplorevietnam.org.`],
    [utc(row.created_at), `Electronic signature consent recorded. Document signed by ${signer} - ${email}${row.ip ? ` IP ${clean(row.ip)}` : ""}.`],
    [utc(row.created_at), `The document has been signed. A signed copy was issued to ${email}. Under the agreement, XploreVietnam accepts it when your payment is confirmed.`],
  ];
  for (const [t, a] of events) {
    const tl = wrap(t, reg, 8.5, 150);
    const al = wrap(a, reg, 8.5, CW - 178);
    const n = Math.max(tl.length, al.length);
    ensure(n * 12 + 14);
    y -= 16;
    tl.forEach((s, i) => draw(s, MX + 8, y - i * 12, 8.5, reg, INK));
    al.forEach((s, i) => draw(s, MX + 170, y - i * 12, 8.5, reg, INK));
    y -= (n - 1) * 12;
  }
  y -= 14;
  rule(y);
  y -= 8;

  // What was agreed to and on what device
  para("Statement recorded at signing", { font: bold, size: 8.5, color: GREY, after: 2 });
  para(`"${row.consent_text}"`, { size: 8.5, lh: 12, after: 8 });
  if (row.user_agent) {
    para("Browser", { font: bold, size: 8.5, color: GREY, after: 2 });
    para(row.user_agent.slice(0, 220), { size: 7.5, lh: 10.5, color: GREY, after: 0 });
  }

  // Panel at the foot of the certificate: QR code that opens the signed document online
  const pTop = 188;
  page.drawRectangle({ x: 0, y: pTop - 86, width: W, height: 86, color: SOFT });
  const q = 66;
  if (opts.viewUrl) {
    page.drawRectangle({ x: MX, y: pTop - 78, width: q + 12, height: q + 12, color: WHITE });
    const qr = QRCode.create(opts.viewUrl, { errorCorrectionLevel: "M" });
    const n = qr.modules.size;
    const cell = q / n;
    for (let r = 0; r < n; r++)
      for (let c = 0; c < n; c++)
        if (qr.modules.data[r * n + c]) page.drawRectangle({ x: MX + 6 + c * cell, y: pTop - 72 + q - (r + 1) * cell, width: cell + 0.25, height: cell + 0.25, color: NAVY });
  }
  const tx = opts.viewUrl ? MX + q + 30 : MX;
  let ty = pTop - 30;
  for (const ln of wrap(
    "This audit trail report provides a detailed record of the electronic signature and events recorded for this agreement." + (opts.viewUrl ? " Scan the code to open the signed document online." : ""),
    reg, 9, W - MX - tx,
  )) { draw(ln, tx, ty, 9, reg, INK); ty -= 13; }

  // ---- Header and footer on every page ------------------------------------------------------
  const pages = pdf.getPages();
  pages.forEach((p, i) => {
    p.drawRectangle({ x: 0, y: H - 34, width: W, height: 34, color: NAVY });
    p.drawRectangle({ x: 0, y: H - 36, width: W, height: 2, color: RED });
    p.drawText("XploreVietnam", { x: MX, y: H - 22, size: 11.5, font: bold, color: WHITE });
    const tag = wrap("Signed agreement", reg, 8.5, 200)[0];
    p.drawText(tag, { x: W - MX - reg.widthOfTextAtSize(tag, 8.5), y: H - 21.5, size: 8.5, font: reg, color: col("#c9cfe0") });
    const f = (s: string, yy: number) => p.drawText(s, { x: MX, y: yy, size: 7.5, font: reg, color: GREY });
    f(`Generated on: ${longDate(row.created_at)}`, 62);
    f("Signed electronically at https://xplorevietnam.org", 51);
    f(`Audit Trail Serial# ${serial}`, 40);
    f(`Document ID: ${docId}`, 29);
    const pg = `Page ${i + 1} of ${pages.length}`;
    p.drawText(pg, { x: W - MX - reg.widthOfTextAtSize(pg, 8.5), y: 62, size: 8.5, font: reg, color: INK });
  });

  pdf.setTitle(`${title} - ${signer}`);
  pdf.setAuthor("XploreVietnam");
  pdf.setCreator("XploreVietnam");
  pdf.setProducer("XploreVietnam");
  pdf.setSubject(`Signed agreement. Document ID ${docId}`);
  pdf.setCreationDate(new Date(row.created_at));
  pdf.setModificationDate(new Date(row.created_at));
  return pdf.save();
}
