import type Stripe from "stripe";
import { json, preflight, websiteOrigin } from "@/lib/cors";
import { lookupCode } from "@/lib/partner-code";
import { packCart, priceCart } from "@/lib/shop";
import { stripe } from "@/lib/stripe";

// Website cart → Stripe Checkout. Returns { url } to redirect to, { quote: true } when an item has no fixed price,
// or { fallback: true } when payments aren't switched on (no Stripe key): the website then sends an order request.
// An optional partner coupon code takes the partner's customer discount off the whole cart and is recorded on the
// order, so the Stripe webhook can credit the partner's commission.
export const OPTIONS = preflight;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { items?: unknown; coupon?: unknown };
  const cart = priceCart(body.items);
  if (!cart.lines.length) return json(request, { error: "empty_cart" }, 400);
  if (cart.quote) return json(request, { quote: true });
  const s = stripe();
  if (!s) return json(request, { fallback: true });

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
  const meta: Record<string, string> = { kind: "shop", cart: packCart(cart.lines), total_usd: String(cart.total) };
  if (partner) meta.partner_code = partner.code;
  const session = await s.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    ...(coupon ? { discounts: [{ coupon: coupon.id }] } : {}),
    billing_address_collection: "required",
    phone_number_collection: { enabled: true },
    customer_creation: "always",
    metadata: meta,
    payment_intent_data: { description: "XploreVietnam order", metadata: meta },
    success_url: `${site}/thank-you.html?order={CHECKOUT_SESSION_ID}`,
    cancel_url: `${site}/cart.html`,
  });
  return json(request, { url: session.url });
}
