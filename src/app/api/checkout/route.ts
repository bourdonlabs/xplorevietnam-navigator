import { NextResponse } from "next/server";
import { IS_DEMO } from "@/lib/supabase/env";
import { supabaseServer } from "@/lib/supabase/server";
import { SERVICE_CATALOG, priceUsd, type ServiceKey } from "@/lib/services";
import { stripe } from "@/lib/stripe";

// Creates a Stripe Checkout session for one individual service and returns its URL.
// { fallback: true } = payments not switched on yet: the browser records a request instead.
export async function POST(request: Request) {
  const s = stripe();
  if (!s || IS_DEMO) return NextResponse.json({ fallback: true });

  const body = (await request.json().catch(() => ({}))) as { service?: string; quantity?: number; dependents?: number };
  const service = body.service as ServiceKey;
  const item = SERVICE_CATALOG[service];
  if (!item) return NextResponse.json({ error: "unknown_service" }, { status: 400 });
  const quantity = Math.min(10, Math.max(1, Math.floor(Number(body.quantity) || 1)));
  const dependents = Math.min(10, Math.max(0, Math.floor(Number(body.dependents) || 0)));

  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user) return NextResponse.json({ error: "not_signed_in" }, { status: 401 });

  const origin = new URL(request.url).origin;
  const amount = priceUsd(service, quantity, dependents);
  const lineItems = [
    {
      quantity,
      price_data: {
        currency: "usd",
        unit_amount: item.unitUsd * 100,
        product_data: { name: item.name, description: item.description },
      },
    },
  ];
  if (item.perDependentUsd && dependents > 0) {
    lineItems.push({
      quantity: dependents,
      price_data: {
        currency: "usd",
        unit_amount: item.perDependentUsd * 100,
        product_data: { name: `${item.name} — dependent`, description: "Review of one dependent's documents." },
      },
    });
  }

  const meta = { user_id: user.id, service, quantity: String(quantity), dependents: String(dependents), amount_usd: String(amount) };
  const session = await s.checkout.sessions.create({
    mode: "payment",
    line_items: lineItems,
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: meta,
    payment_intent_data: { description: `XploreVietnam — ${item.name}`, metadata: meta },
    success_url: `${origin}${item.page}?checkout=success`,
    cancel_url: `${origin}${item.page}?checkout=cancelled`,
  });
  return NextResponse.json({ url: session.url });
}
