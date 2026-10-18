import type Stripe from "stripe";
import { priceCart, unpackCart } from "./shop";

/** Short order reference shown on the thank-you page and in both emails. Derived from the Stripe session, so it is the same everywhere. */
export const orderRef = (sessionId: string) => sessionId.slice(-8).toUpperCase();

const maskEmail = (e: string) => {
  const [u, d] = e.split("@");
  return u && d ? `${u[0]}${u.length > 1 ? "***" : ""}@${d}` : "";
};

type SessionLike = Pick<Stripe.Checkout.Session, "id" | "payment_status" | "amount_total" | "metadata" | "customer_details" | "livemode">;

/** What the thank-you page may show about a paid website order. Prices are re-derived from the catalog, never taken from the browser. */
export function summarizeOrder(s: SessionLike) {
  const lines = priceCart(unpackCart(s.metadata?.cart)).lines.filter((l) => l.price != null);
  const items = lines.map((l) => {
    const total = (l.price || 0) + l.addons.reduce((a, x) => a + x.price, 0);
    const detail = [
      l.options.visa_type,
      l.dependents ? `${l.dependents} dependent${l.dependents > 1 ? "s" : ""}` : "",
      ...l.addons.map((a) => a.name),
      l.deposit < 1 ? `${Math.round(l.deposit * 100)}% now, the rest after your application is submitted` : "",
    ].filter(Boolean).join(" · ");
    return { name: l.name, detail, total, dueNow: l.dueNow };
  });
  const listDueNow = items.reduce((a, i) => a + i.dueNow, 0);
  const paidToday = Math.round(s.amount_total || 0) / 100;
  const balance = lines.reduce((a, l) => a + ((l.price || 0) - Math.round((l.price || 0) * l.deposit)), 0);
  const name = (s.customer_details?.name || "").trim();
  return {
    paid: s.payment_status === "paid",
    test: !s.livemode,
    ref: orderRef(s.id),
    first: name.split(/\s+/)[0] || "",
    email: maskEmail(s.customer_details?.email || ""),
    items,
    paidToday,
    discount: Math.max(0, Math.round((listDueNow - paidToday) * 100) / 100),
    balance,
  };
}
