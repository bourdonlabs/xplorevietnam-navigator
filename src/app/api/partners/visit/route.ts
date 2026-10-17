import { json, preflight } from "@/lib/cors";
import { cleanCode, trackVisit } from "@/lib/partner-code";

// One click on a partner's ?ref=CODE link, sent by the website. Always answers ok: tracking never breaks a page.
export const OPTIONS = preflight;

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as { code?: unknown; page?: unknown } | null;
  const code = cleanCode(b?.code);
  if (code.length >= 3) await trackVisit(code, typeof b?.page === "string" ? b.page : "");
  return json(request, { ok: true });
}
