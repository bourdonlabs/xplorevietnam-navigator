import { after } from "next/server";
import { json, preflight } from "@/lib/cors";
import { CONSENT, agreeText, buildDocuments } from "@/lib/agreements";
import { mailConfigured } from "@/lib/mailer";
import { priceCart } from "@/lib/shop";
import { appOrigin } from "@/lib/signed-link";
import { mailSignedAgreement } from "@/lib/signed-mail";
import { supabaseAdmin } from "@/lib/stripe";

// Records a customer's e-signature on one agreement. The agreement text and prices are rebuilt here from the cart, so
// the record holds exactly what the customer was shown. Right after saving, the signed copy (PDF) is emailed to the
// address they typed. This endpoint is public, so that email is the one thing someone could abuse by typing another
// person's address. It is limited three ways: the name must look like a real name (letters only, so no links or
// sales text can be put in it), no more than 8 emails per address per day, 12 per IP address per hour and 100 an hour
// in total (to protect the sender's reputation), and the
// subject line carries only the agreement title, never the name. Skipped emails lose nothing: the receipt sent
// after payment still includes the signed agreement.
export const OPTIONS = preflight;

const NAME_OK = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]{1,79}$/u;
const MAX_PER_EMAIL_DAY = 8;
const MAX_PER_IP_HOUR = 12;
const MAX_ALL_HOUR = 100;

type Signer = { name?: string; email?: string; phone?: string; country?: string; line1?: string; line2?: string; city?: string; postcode?: string };
type Sig = { type?: string; font?: string; image?: string };
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { items?: unknown; key?: unknown; signer?: Signer; signature?: Sig; consent?: unknown };
  const s = body.signer || {};
  const sig = body.signature || {};
  const name = clip(s.name, 200);
  const email = clip(s.email, 320).toLowerCase();
  if (name.length < 2) return json(request, { error: "name_required" }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(request, { error: "email_invalid" }, 400);
  if (body.consent !== true) return json(request, { error: "consent_required" }, 400);
  if ((sig.type !== "typed" && sig.type !== "drawn") || typeof sig.image !== "string" || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(sig.image) || sig.image.length > 190000) {
    return json(request, { error: "signature_required" }, 400);
  }

  const cart = priceCart(body.items);
  const doc = buildDocuments(cart.lines).find((d) => d.key === body.key);
  if (!doc) return json(request, { error: "unknown_agreement" }, 400);

  const db = supabaseAdmin();
  if (!db) return json(request, { error: "not_configured" }, 501);

  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim() || null;
  let fromIp = 0; // signatures from this IP in the last hour, before this one
  if (ip) {
    const { count } = await db
      .from("signed_agreements")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gt("created_at", new Date(Date.now() - 3600 * 1000).toISOString());
    if ((count || 0) >= 30) return json(request, { error: "too_many" }, 429);
    fromIp = count || 0;
  }

  const { data, error } = await db
    .from("signed_agreements")
    .insert({
      agreement_key: doc.key,
      version: doc.version,
      title: doc.title,
      content_sha256: doc.sha256,
      cart_hash: doc.cart_hash,
      body: { title: doc.title, subtitle: doc.subtitle, sections: doc.sections, lines: doc.lines },
      skus: doc.lines.map((l) => l.sku),
      signer_name: name,
      signer_email: email,
      signer_phone: clip(s.phone, 60) || null,
      signer_country: clip(s.country, 80) || null,
      signer_address: { line1: clip(s.line1, 200), line2: clip(s.line2, 200), city: clip(s.city, 100), postcode: clip(s.postcode, 30), country: clip(s.country, 80) },
      signature_type: sig.type,
      signature_font: clip(sig.font, 60) || null,
      signature_image: sig.image,
      consent_text: `${CONSENT} ${agreeText(name)}`,
      ip,
      user_agent: clip(request.headers.get("user-agent"), 500) || null,
    })
    .select("*")
    .single();
  if (error || !data) {
    console.error("agreement_save_failed", error?.message);
    return json(request, { error: "save_failed" }, 500);
  }

  // Email the signed copy, unless this looks like abuse (see the note at the top).
  let copy: "email" | null = null;
  if (mailConfigured() && NAME_OK.test(name) && fromIp + 1 <= MAX_PER_IP_HOUR) {
    const { count: sameEmail } = await db
      .from("signed_agreements")
      .select("id", { count: "exact", head: true })
      .eq("signer_email", email)
      .gt("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());
    const { count: lastHour } = await db
      .from("signed_agreements")
      .select("id", { count: "exact", head: true })
      .gt("created_at", new Date(Date.now() - 3600 * 1000).toISOString());
    if ((sameEmail || 0) <= MAX_PER_EMAIL_DAY && (lastHour || 0) <= MAX_ALL_HOUR) {
      const origin = appOrigin(request);
      after(() => mailSignedAgreement(data, origin));
      copy = "email";
    }
  }
  return json(request, { id: data.id, signedAt: data.created_at, copy });
}
