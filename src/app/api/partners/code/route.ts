import { json, preflight } from "@/lib/cors";
import { lookupCode } from "@/lib/partner-code";

// Cart coupon check: is this a valid partner code, and what percentage does it take off?
export const OPTIONS = preflight;

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as { code?: unknown } | null;
  const p = await lookupCode(b?.code);
  if (!p) return json(request, { valid: false });
  return json(request, { valid: true, code: p.code, percent: Math.round(p.discount * 10000) / 100 });
}
