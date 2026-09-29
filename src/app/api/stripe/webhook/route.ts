import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, supabaseAdmin } from "@/lib/stripe";
import { priceCart, unpackCart } from "@/lib/shop";

// Stripe → Navigator. Records a paid Navigator service request, or a paid website order, once Checkout completes.
// Set in Stripe Dashboard > Developers > Webhooks: endpoint /api/stripe/webhook,
// events checkout.session.completed and checkout.session.async_payment_succeeded.
export async function POST(request: Request) {
  const s = stripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const db = supabaseAdmin();
  if (!s || !secret || !db) return NextResponse.json({ error: "not_configured" }, { status: 501 });

  let event: Stripe.Event;
  try {
    event = await s.webhooks.constructEventAsync(await request.text(), request.headers.get("stripe-signature") || "", secret);
  } catch {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const session = event.data.object as Stripe.Checkout.Session;
    const m = session.metadata || {};
    // Website cart order
    if (session.payment_status === "paid" && m.kind === "shop") {
      const cart = priceCart(unpackCart(m.cart));
      const c = session.customer_details;
      const { error } = await db.from("orders").upsert(
        {
          stripe_session_id: session.id,
          email: c?.email || null,
          name: c?.name || null,
          phone: c?.phone || null,
          address: c?.address || null,
          items: cart.lines.map((l) => ({
            sku: l.sku, name: l.name, dependents: l.dependents, options: l.options, addons: l.addons.map((a) => a.name),
            price_usd: l.price, paid_now_usd: l.dueNow, deposit: l.deposit,
          })),
          amount_total: session.amount_total || 0,
          currency: session.currency || "usd",
          status: "paid",
        },
        { onConflict: "stripe_session_id", ignoreDuplicates: true },
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ received: true });
    }
    if (session.payment_status === "paid" && m.user_id && m.service) {
      const { error } = await db.from("service_requests").upsert(
        {
          user_id: m.user_id,
          service: m.service,
          quantity: Number(m.quantity || 1),
          dependents: Number(m.dependents || 0),
          amount_usd: Math.round((session.amount_total || 0) / 100),
          status: "paid",
          stripe_session_id: session.id,
        },
        { onConflict: "stripe_session_id", ignoreDuplicates: true },
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  return NextResponse.json({ received: true });
}
