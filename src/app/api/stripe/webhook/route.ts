import { after, NextResponse } from "next/server";
import type Stripe from "stripe";
import { mailPaidOrder } from "@/lib/order-mail";
import { stripe, supabaseAdmin } from "@/lib/stripe";
import { priceCart, unpackCart } from "@/lib/shop";

type Db = NonNullable<ReturnType<typeof supabaseAdmin>>;

/** Credits the partner whose code was used: their rate times what the customer paid at checkout, payable 30 days later. */
async function creditPartner(db: Db, session: Stripe.Checkout.Session, code: string) {
  const { data: p } = await db.from("partners").select("id, email, commission_rate, status").eq("code", code).maybeSingle();
  if (!p || p.status !== "active") return;
  // No commission on a partner's own purchase.
  const buyer = session.customer_details?.email?.toLowerCase();
  if (buyer && p.email && buyer === String(p.email).toLowerCase()) return;
  const sale = (session.amount_total || 0) / 100;
  const commission = Math.round(sale * Number(p.commission_rate) * 100) / 100;
  if (commission <= 0) return;
  const { data: order } = await db.from("orders").select("id").eq("stripe_session_id", session.id).maybeSingle();
  await db.from("partner_commissions").upsert(
    {
      partner_id: p.id,
      order_id: order?.id ?? null,
      stripe_session_id: session.id,
      sale_usd: sale,
      rate: p.commission_rate,
      commission_usd: commission,
      payable_on: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    },
    { onConflict: "stripe_session_id", ignoreDuplicates: true },
  );
}

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
      const { data: before } = await db.from("orders").select("id").eq("stripe_session_id", session.id).maybeSingle();
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
          // Only sent when a code was used, so orders keep saving even before the partner migration is run.
          ...(m.partner_code ? { partner_code: m.partner_code } : {}),
        },
        { onConflict: "stripe_session_id", ignoreDuplicates: true },
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (m.partner_code) await creditPartner(db, session, m.partner_code);

      // Attach the agreements the customer signed to this order (only ones not yet attached, so a repeat delivery does nothing).
      const { data: order } = await db.from("orders").select("id").eq("stripe_session_id", session.id).maybeSingle();
      const ids = (m.agreement_ids || "").split(",").filter((x) => /^[0-9a-f-]{36}$/i.test(x));
      let linked: Parameters<typeof mailPaidOrder>[0]["agreements"] = [];
      if (ids.length) {
        const { data } = await db
          .from("signed_agreements")
          .update({ stripe_session_id: session.id, order_id: order?.id ?? null })
          .in("id", ids)
          .is("stripe_session_id", null)
          .select("id, title, version, created_at, signer_name, signer_email, body");
        linked = data || [];
      }
      // Emails go out once per order: on the first delivery, or when a retry is the one that attached the agreements.
      if (!before || linked.length) {
        const origin = new URL(request.url).origin;
        after(() => mailPaidOrder({ session, lines: cart.lines, agreements: linked, origin, orderId: order?.id }));
      }
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
