import { createHmac, timingSafeEqual } from "node:crypto";

// The "View Signed Document" button in the signing email opens the PDF without a login. What protects it is a signed
// token that only this server can make for a given agreement id: the id is a random UUID and the token is an HMAC of
// it, so a link cannot be guessed or built from another one. Nothing is stored; the token is worked out again on each
// request. AGREEMENT_LINK_SECRET is the key (set it in Vercel); until it is set the Supabase service key is used.
const secret = () => process.env.AGREEMENT_LINK_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const linkToken = (id: string) => {
  const k = secret();
  return k ? createHmac("sha256", k).update(`signed-agreement-view:${id}`).digest("base64url") : null;
};

export function linkOk(id: string, token: string) {
  const want = linkToken(id);
  if (!want || !token) return false;
  const a = Buffer.from(want);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** The address of Navigator that emails link to. NAVIGATOR_URL overrides it (useful in testing). */
export const appOrigin = (request: Request) => (process.env.NAVIGATOR_URL || "").replace(/\/+$/, "") || new URL(request.url).origin;

export const viewUrl = (origin: string, id: string) => {
  const t = linkToken(id);
  return t ? `${origin}/api/shop/agreements/signed/${id}?t=${t}` : null;
};
