import { createClient } from "@supabase/supabase-js";
import { json, preflight } from "@/lib/cors";
import { checkAvailable, cleanCode, cleanUsername } from "@/lib/partner-code";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Website partner sign-up: creates a Navigator account that carries the partner details. When the person confirms
// their email and logs in, the /partner page turns those details into the partner account and coupon code.
export const OPTIONS = preflight;

const clip = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(request: Request) {
  const b = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!b) return json(request, { error: "bad_request", message: "Something went wrong. Please try again." }, 400);
  // Spam trap: the hidden "website" field is empty for people and filled in by most bots. Pretend it worked.
  if (typeof b.website === "string" && b.website.trim()) return json(request, { ok: true });

  const email = clip(b.email, 320).toLowerCase();
  const password = typeof b.password === "string" ? b.password : "";
  const username = cleanUsername(b.username);
  const code = cleanCode(b.code);
  const fail = (error: string, message: string, status = 400) => json(request, { error, message }, status);

  if (!EMAIL.test(email)) return fail("bad_email", "Enter a valid email address, like name@example.com.");
  if (password.length < 8 || password.length > 72) return fail("bad_password", "Choose a password of at least 8 characters.");
  if (!/^[a-z0-9][a-z0-9_.-]{2,29}$/.test(username)) return fail("bad_username", "Usernames use 3 to 30 letters, numbers, dots, dashes or underscores.");
  if (code.length < 3) return fail("bad_code", "Coupon codes use 3 to 20 letters and numbers.");
  if (!SUPABASE_URL || !SUPABASE_KEY) return fail("not_configured", "Partner sign-up is not switched on yet. Please email info@xplorevietnam.org.", 503);

  const free = await checkAvailable(username, code);
  if (free && !free.code_ok) return fail("code_taken", "That coupon code is already taken. Try another one.", 409);
  if (free && !free.username_ok) return fail("username_taken", "That username is already taken. Try another one.", 409);

  const partner = {
    username, code,
    name: clip(b.name, 200), paypal_email: clip(b.paypal_email, 320),
    promote_via: clip(b.promote_via, 200), content_url: clip(b.content_url, 300),
  };
  const db = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: { data: { partner }, emailRedirectTo: `${new URL(request.url).origin}/auth/callback?next=/partner` },
  });
  if (error) return fail("signup_failed", error.message, 400);
  // Supabase returns a user with no identities when the email already has an account.
  if (data.user && data.user.identities?.length === 0) {
    return fail("account_exists", "An account with this email already exists. Log in to Navigator and open Partner program to join from there.", 409);
  }
  return json(request, { ok: true, confirm: !data.session });
}
