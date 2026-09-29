// Website cart pricing. Prices come only from website/src/data/catalog.json (the same file the website renders),
// so the amount charged always matches the price shown. The browser only sends SKUs and choices.
import catalog from "../../website/src/data/catalog.json";

type Item = {
  name: string;
  group: string;
  price: number | null;
  dependent?: number | null;
  maxDependents?: number;
  deposit?: number;
  fees?: string;
  addons?: string[];
  options?: Record<string, string[]>;
};
const ITEMS = catalog.items as Record<string, Item>;
const ADDONS = catalog.addons as Record<string, { name: string; price: number }>;

export type CartInput = { sku: string; dependents?: number; addons?: string[]; options?: Record<string, string> };
export type CartLine = {
  sku: string;
  name: string;
  group: string;
  dependents: number;
  addons: { key: string; name: string; price: number }[];
  options: Record<string, string>;
  price: number | null; // package incl. dependents, before deposit; null = quote needed
  dueNow: number; // what checkout charges for this line (deposit share + add-ons)
  deposit: number;
};

/** Validates a cart from the browser. Unknown SKUs/add-ons/options are dropped; max 10 lines. */
export function priceCart(input: unknown): { lines: CartLine[]; quote: boolean; dueNow: number; total: number } {
  const raw = Array.isArray(input) ? (input as CartInput[]).slice(0, 10) : [];
  const lines: CartLine[] = [];
  for (const r of raw) {
    const it = r && typeof r.sku === "string" ? ITEMS[r.sku] : undefined;
    if (!it || lines.some((l) => l.sku === r.sku)) continue;
    const dependents = Math.min(it.maxDependents || 0, Math.max(0, Math.floor(Number(r.dependents) || 0)));
    const addons = (Array.isArray(r.addons) ? r.addons : [])
      .filter((a) => (it.addons || []).includes(a) && ADDONS[a])
      .map((a) => ({ key: a, name: ADDONS[a].name, price: ADDONS[a].price }));
    const options: Record<string, string> = {};
    for (const [k, allowed] of Object.entries(it.options || {})) {
      const v = r.options?.[k];
      if (typeof v === "string" && allowed.includes(v)) options[k] = v;
    }
    const price = it.price == null || (dependents > 0 && it.dependent == null) ? null : it.price + dependents * (it.dependent || 0);
    const deposit = it.deposit && it.deposit > 0 && it.deposit < 1 ? it.deposit : 1;
    const addonTotal = addons.reduce((s, a) => s + a.price, 0);
    lines.push({
      sku: r.sku, name: it.name, group: it.group, dependents, addons, options, price, deposit,
      dueNow: price == null ? 0 : Math.round(price * deposit) + addonTotal,
    });
  }
  const quote = lines.some((l) => l.price == null);
  return {
    lines,
    quote,
    dueNow: lines.reduce((s, l) => s + l.dueNow, 0),
    total: lines.reduce((s, l) => s + (l.price || 0) + l.addons.reduce((a, x) => a + x.price, 0), 0),
  };
}

/** Compact cart for Stripe metadata (500-char limit per value). */
export const packCart = (lines: CartLine[]) =>
  JSON.stringify(lines.map((l) => [l.sku, l.dependents, l.addons.map((a) => a.key), l.options.visa_type || ""]));

export function unpackCart(s: string | undefined): CartInput[] {
  try {
    return (JSON.parse(s || "[]") as [string, number, string[], string][]).map(([sku, dependents, addons, vt]) => ({
      sku, dependents, addons, options: (vt ? { visa_type: vt } : {}) as Record<string, string>,
    }));
  } catch {
    return [];
  }
}
