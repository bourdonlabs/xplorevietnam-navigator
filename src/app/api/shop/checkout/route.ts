import type Stripe from "stripe";
import { json, preflight, websiteOrigin } from "@/lib/cors";
import { agreementsReady, verifyAgreements } from "@/lib/agreements";
import { lookupCode } from "@/lib/partner-code";
import { packCart, priceCart } from "@/lib/shop";
import { stripe, supabaseAdmin } from "@/lib/stripe";

// Website cart → Stripe Checkout. Returns { url } to redirect to, { quote: true } when an item has no fixed price,
// or { fallback: true } when payments aren't switched on (no Stripe key): the website then sends an order request.
// An optional partner coupon code takes the partner's customer discount off the whole cart and is recorded on the
// order, so the Stripe webhook can credit the partner's commission.
// Before any payment page opens, the customer must have e-signed every agreement the cart needs (see agreements.ts),
// with the same email, for these exact items. Apple Pay and Google Pay appear on Stripe's page by themselves when
// they are switched on in the Stripe Dashboard (Settings > Payment methods) and the device supports them.
export const OPTIONS = preflight;

type Customer = { name?: string; email?: string; phone?: string; country?: string; line1?: string; line2?: string; city?: string; postcode?: string };
const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { items?: unknown; coupon?: unknown; agreements?: unknown; customer?: Customer };
  const cart = priceCart(body.items);
  if (!cart.lines.length) return json(request, { error: "empty_cart" }, 400);
  if (cart.quote) return json(request, { quote: true });
  const s = stripe();
  if (!s) return json(request, { fallback: true });

  // Live payments stay off until the agreement wording is final (company details filled in and a lawyer has reviewed it).
  if (process.env.STRIPE_SECRET_KEY?.startsWith("sk_live") && !agreementsReady()) return json(request, { error: "agreements_not_ready" }, 503);

  const c = body.customer || {};
  const email = clip(c.email, 320).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json(request, { error: "email_invalid" }, 400);
  const db = supabaseAdmin();
  if (!db) return json(request, { error: "not_configured" }, 501);
  const signed = await verifyAgreements(db, cart.lines, body.agreements, email);
  if (!signed.ok) return json(request, { error: "agreement_required", missing: signed.missing }, 409);

  // Reuse the customer's Stripe record (matched by email) so Stripe's page opens with their details filled in.
  const details = {
    name: clip(c.name, 200) || undefined,
    phone: clip(c.phone, 60) || undefined,
    address: {
      line1: clip(c.line1, 200) || undefined, line2: clip(c.line2, 200) || undefined, city: clip(c.city, 100) || undefined,
      postal_code: clip(c.postcode, 30) || undefined, country: /^[A-Za-z]{2}$/.test(clip(c.country, 2)) ? clip(c.country, 2).toUpperCase() : undefined,
    },
  };
  const found = await s.customers.list({ email, limit: 1 });
  const customer = found.data[0] ? await s.customers.update(found.data[0].id, details) : await s.customers.create({ email, ...details });

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const l of cart.lines) {
    const deps = l.dependents ? ` (incl. ${l.dependents} dependent${l.dependents > 1 ? "s" : ""})` : "";
    const part = l.deposit < 1 ? ` — ${Math.round(l.deposit * 100)}% at booking` : "";
    const desc = [l.options.visa_type && `Visa type: ${l.options.visa_type}`, l.deposit < 1 && `Balance of $${(l.price! - Math.round(l.price! * l.deposit)).toLocaleString("en-US")} due after your application is submitted`]
      .filter(Boolean)
      .join(". ");
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: Math.round(l.price! * l.deposit) * 100,
        product_data: { name: `${l.name}${deps}${part}`, ...(desc ? { description: desc } : {}) },
      },
    });
    for (const a of l.addons) {
      lineItems.push({ quantity: 1, price_data: { currency: "usd", unit_amount: a.price * 100, product_data: { name: a.name } } });
    }
  }

  // Partner code: a code that does not check out is ignored, never an error at the till.
  const partner = body.coupon ? await lookupCode(body.coupon) : null;
  const percent = partner ? Math.round(partner.discount * 10000) / 100 : 0;
  const coupon = partner && percent > 0
    ? await s.coupons.create({ percent_off: percent, duration: "once", max_redemptions: 1, name: `Partner code ${partner.code} (${percent}% off)` })
    : null;

  const site = websiteOrigin(request);
  const meta: Record<string, string> = { kind: "shop", cart: packCart(cart.lines), total_usd: String(cart.total), agreement_ids: signed.ids.join(",") };
  if (partner) meta.partner_code = partner.code;
  const session = await s.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
    customer: customer.id,
    customer_update: { name: "auto", address: "auto" },
    billing_address_collection: "required",
    metadata: meta,
    payment_intent_data: { description: "XploreVietnam order", metadata: meta },
    success_url: `${site}/thank-you.html?order={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/cart.html`,
  });
  return json(request, { url: session.url });
}
