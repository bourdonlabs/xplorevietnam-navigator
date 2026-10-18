import { json, preflight } from "@/lib/cors";
import { summarizeOrder } from "@/lib/order-summary";
import { stripe } from "@/lib/stripe";

// The thank-you page asks what was just paid. The Stripe session id in the return URL is unguessable and is the only
// key; the answer holds items, amounts and a masked email, nothing else.
export const OPTIONS = preflight;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { session?: unknown };
  const id = typeof body.session === "string" ? body.session : "";
  if (!/^cs_(test|live)_[A-Za-z0-9]{10,200}$/.test(id)) return json(request, { error: "not_found" }, 404);
  const s = stripe();
  if (!s) return json(request, { error: "not_configured" }, 501);
  try {
    const session = await s.checkout.sessions.retrieve(id);
    if (session.metadata?.kind !== "shop") return json(request, { error: "not_found" }, 404);
    return json(request, summarizeOrder(session));
  } catch {
    return json(request, { error: "not_found" }, 404);
  }
}
