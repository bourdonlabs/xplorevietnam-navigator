import { appOrigin, linkOk, viewUrl } from "@/lib/signed-link";
import { signedAgreementPdf } from "@/lib/signed-pdf";
import { supabaseAdmin } from "@/lib/stripe";

// The "View Signed Document" link from the signing email. The PDF is built from the stored record each time, so it is
// the same document that was attached to the email. Anyone without a valid token (or with a wrong id) gets the same
// plain 404, so the address says nothing about which agreements exist.
const HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
const notFound = () => new Response("Not found", { status: 404, headers: HEADERS });

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("t") || "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) || !linkOk(id, token)) return notFound();
  const db = supabaseAdmin();
  if (!db) return notFound();
  const { data } = await db.from("signed_agreements").select("*").eq("id", id).maybeSingle();
  if (!data) return notFound();
  const pdf = await signedAgreementPdf(data, { viewUrl: viewUrl(appOrigin(request), id) });
  const name = String(data.title).replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "Agreement";
  return new Response(new Blob([Buffer.from(pdf)], { type: "application/pdf" }), {
    headers: { ...HEADERS, "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${name}-signed.pdf"` },
  });
}
