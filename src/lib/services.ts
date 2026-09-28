// Individual services sold inside Navigator. Prices are the website's (Navigator section).
// The server recomputes every amount from this table; the browser never sets a price.

export type ServiceKey = "tax_code" | "bank_account" | "visa_review";

export const SERVICE_CATALOG: Record<
  ServiceKey,
  { name: string; description: string; unitUsd: number; perDependentUsd?: number; page: string }
> = {
  tax_code: {
    name: "Vietnamese Tax Code (MST)",
    description: "Personal tax code registration with the tax office, handled by XploreVietnam.",
    unitUsd: 150,
    page: "/vietnam/tax-code",
  },
  bank_account: {
    name: "Vietnamese Bank Account",
    description: "Document preparation and bank appointment, handled by XploreVietnam.",
    unitUsd: 325,
    page: "/vietnam/bank-account",
  },
  visa_review: {
    name: "Visa Packet Review",
    description: "Written review of your visa documents within 3 business days plus a 30-minute expert call.",
    unitUsd: 595,
    perDependentUsd: 125,
    page: "/vietnam/visa",
  },
};

export function priceUsd(service: ServiceKey, quantity = 1, dependents = 0) {
  const s = SERVICE_CATALOG[service];
  return s.unitUsd * Math.max(1, quantity) + (s.perDependentUsd || 0) * Math.max(0, dependents);
}

/** Card payments are on only when the Stripe keys are set (NEXT_PUBLIC_STRIPE_ENABLED=1 shows the Stripe wording). */
export const STRIPE_ON = process.env.NEXT_PUBLIC_STRIPE_ENABLED === "1";
