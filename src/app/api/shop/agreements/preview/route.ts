import { json, preflight } from "@/lib/cors";
import { COMPANY, agreementsReady, buildDocuments } from "@/lib/agreements";
import { priceCart } from "@/lib/shop";

// The checkout page asks which agreements the cart needs and how much it comes to. Everything (text, prices, totals)
// is worked out here from the catalog, so the browser never supplies a price or a word of the agreement.
export const OPTIONS = preflight;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { items?: unknown };
  const cart = priceCart(body.items);
  if (!cart.lines.length) return json(request, { error: "empty_cart" }, 400);
  const priced = cart.lines.filter((l) => l.price != null);
  const documents = buildDocuments(priced).map((d) => ({
    key: d.key, version: d.version, title: d.title, subtitle: d.subtitle, sections: d.sections, lines: d.lines, cart_hash: d.cart_hash,
  }));
  const total = priced.reduce((s, l) => s + (l.price || 0) + l.addons.reduce((a, x) => a + x.price, 0), 0);
  const dueNow = priced.reduce((s, l) => s + l.dueNow, 0);
  return json(request, {
    documents,
    quoted: cart.lines.filter((l) => l.price == null).map((l) => l.sku),
    lines: priced.map((l) => ({ sku: l.sku, name: l.name, dependents: l.dependents, addons: l.addons.map((a) => a.name), options: l.options, price: l.price, total: (l.price || 0) + l.addons.reduce((a, x) => a + x.price, 0), dueNow: l.dueNow })),
    totals: { total, dueNow, later: total - dueNow },
    draft: !agreementsReady(),
    company: COMPANY.name,
  });
}
