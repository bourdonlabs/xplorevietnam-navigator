export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
// Supabase now issues "publishable" keys; older projects still use the anon key. Either works.
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** No Supabase keys = demo mode: everything is stored in this browser only. */
export const IS_DEMO = !SUPABASE_URL || !SUPABASE_KEY;
