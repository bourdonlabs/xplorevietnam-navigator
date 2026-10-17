"use client";
// Partner program data (0007_partner_program.sql): a partner's own dashboard data and the staff view of all partners.
// Everything runs as the signed-in user, so row level security decides what each person can read or change.
import { IS_DEMO } from "./supabase/env";
import { supabaseBrowser } from "./supabase/client";

export type Program = "referral" | "affiliate";
export type PartnerStatus = "active" | "suspended";
export type PayoutMethod = "paypal" | "bank";

export const PROGRAMS: { value: Program; label: string }[] = [
  { value: "referral", label: "Referral program" },
  { value: "affiliate", label: "Affiliate program" },
];
export const PROMOTE_OPTIONS = [
  "Word of mouth (friends, family, colleagues)",
  "Videos or social media content",
  "Blog or SEO content (articles)",
  "Online forums or groups",
  "Listings or directories",
  "Interviews or podcasts",
];
/** Where a partner's link points: the public website. Anything after ?ref= is the partner's coupon code. */
export const SHARE_BASE = "https://xplorevietnam.org/";
export const shareLink = (code: string) => `${SHARE_BASE}?ref=${code}`;

export type Partner = {
  id: string;
  user_id: string;
  program: Program;
  username: string;
  code: string;
  name: string | null;
  email: string | null;
  paypal_email: string | null;
  payout_method: PayoutMethod;
  bank_details: string | null;
  promote_via: string | null;
  content_url: string | null;
  commission_rate: number;
  customer_discount: number;
  status: PartnerStatus;
  created_at: string;
};
export type Summary = {
  partner_id: string;
  visits: number;
  sales: number;
  sales_usd: number;
  pending_usd: number;
  payable_usd: number;
  paid_usd: number;
};
export type CommissionStatus = "pending" | "paid" | "void";
export type Commission = {
  id: string;
  partner_id: string;
  order_id: string | null;
  stripe_session_id: string;
  sale_usd: number;
  rate: number;
  commission_usd: number;
  status: CommissionStatus;
  payable_on: string;
  paid_at: string | null;
  payout_ref: string | null;
  note: string | null;
  created_at: string;
};
/** What a partner sees: "pending" turns into "payable" once the 30 days are up. */
export type CommissionState = "pending" | "payable" | "paid" | "void";
export const commissionState = (c: Pick<Commission, "status" | "payable_on">): CommissionState =>
  c.status !== "pending" ? c.status : c.payable_on <= new Date().toISOString().slice(0, 10) ? "payable" : "pending";
export const STATE_META: Record<CommissionState, { label: string; tone: string }> = {
  pending: { label: "Pending", tone: "bg-amber-50 text-amber-800 ring-amber-200" },
  payable: { label: "Payable", tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  paid: { label: "Paid", tone: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  void: { label: "Void", tone: "bg-gray-100 text-gray-600 ring-gray-200" },
};

export type RegisterInput = {
  username: string;
  code: string;
  name?: string;
  paypal_email?: string;
  promote_via?: string;
  content_url?: string;
};
type Result = { error?: string };

const num = (v: unknown) => Number(v) || 0;
const cleanPartner = (p: Record<string, unknown>) =>
  ({ ...p, commission_rate: num(p.commission_rate), customer_discount: num(p.customer_discount) }) as unknown as Partner;
const cleanSummary = (s: Record<string, unknown>) =>
  ({
    partner_id: s.partner_id as string,
    visits: num(s.visits),
    sales: num(s.sales),
    sales_usd: num(s.sales_usd),
    pending_usd: num(s.pending_usd),
    payable_usd: num(s.payable_usd),
    paid_usd: num(s.paid_usd),
  }) satisfies Summary;
const cleanCommission = (c: Record<string, unknown>) =>
  ({ ...c, sale_usd: num(c.sale_usd), rate: num(c.rate), commission_usd: num(c.commission_usd) }) as unknown as Commission;

/** Turns the database's short error codes into something a person can act on. */
export function friendlyError(message: string) {
  if (message.includes("code_taken")) return "That coupon code is already taken. Try another one.";
  if (message.includes("username_taken")) return "That username is already taken. Try another one.";
  if (message.includes("bad_username")) return "Usernames use 3 to 30 letters, numbers, dots, dashes or underscores.";
  if (message.includes("bad_code")) return "Coupon codes use 3 to 20 letters and numbers, with no spaces.";
  if (message.includes("not_signed_in")) return "Please log in again.";
  if (message.includes("staff_only")) return "Only the XploreVietnam team can do that.";
  if (/relation .* does not exist|schema cache|Could not find the (function|table)/i.test(message))
    return "The partner program is not switched on in the database yet.";
  return message;
}

export const partnerProgram = {
  /** Partner accounts need the live database; demo mode (no Supabase keys) has none. */
  available: !IS_DEMO,

  /** Details saved at sign-up on the website, waiting for the person to confirm their email and log in. */
  async pendingSignup(): Promise<RegisterInput | null> {
    const { data } = await supabaseBrowser().auth.getUser();
    const p = data.user?.user_metadata?.partner as Record<string, string> | undefined;
    return p?.username && p?.code
      ? { username: p.username, code: p.code, name: p.name, paypal_email: p.paypal_email, promote_via: p.promote_via, content_url: p.content_url }
      : null;
  },

  async mine(userId: string): Promise<Partner | null> {
    const { data, error } = await supabaseBrowser().from("partners").select("*").eq("user_id", userId).maybeSingle();
    if (error) throw new Error(error.message);
    return data ? cleanPartner(data) : null;
  },

  async register(input: RegisterInput): Promise<{ partner?: Partner; error?: string }> {
    const { data, error } = await supabaseBrowser().rpc("register_partner", {
      p_username: input.username,
      p_code: input.code,
      p_name: input.name || null,
      p_paypal_email: input.paypal_email || null,
      p_promote_via: input.promote_via || null,
      p_content_url: input.content_url || null,
    });
    if (error) return { error: friendlyError(error.message) };
    return { partner: cleanPartner(data as Record<string, unknown>) };
  },

  async updateDetails(
    id: string,
    patch: Partial<Pick<Partner, "name" | "paypal_email" | "payout_method" | "bank_details" | "promote_via" | "content_url">>,
  ): Promise<Result> {
    const { error } = await supabaseBrowser().from("partners").update(patch).eq("id", id);
    return error ? { error: friendlyError(error.message) } : {};
  },

  async summary(partnerId: string): Promise<Summary | null> {
    const { data } = await supabaseBrowser().from("partner_summary").select("*").eq("partner_id", partnerId).maybeSingle();
    return data ? cleanSummary(data) : null;
  },

  async commissions(partnerId: string): Promise<Commission[]> {
    const { data, error } = await supabaseBrowser()
      .from("partner_commissions").select("*").eq("partner_id", partnerId).order("created_at", { ascending: false }).limit(500);
    if (error) throw new Error(error.message);
    return (data || []).map(cleanCommission);
  },

  /** Clicks per day for the last `days` days, oldest first, including days with none. */
  async clicksByDay(partnerId: string, days = 30): Promise<{ key: string; label: string; value: number }[]> {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    from.setDate(from.getDate() - (days - 1));
    const { data } = await supabaseBrowser()
      .from("partner_visits").select("created_at").eq("partner_id", partnerId).gte("created_at", from.toISOString()).limit(20000);
    const counts = new Map<string, number>();
    const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    (data || []).forEach((v: { created_at: string }) => counts.set(dayKey(new Date(v.created_at)), (counts.get(dayKey(new Date(v.created_at))) || 0) + 1));
    return Array.from({ length: days }, (_, i) => {
      const d = new Date(from);
      d.setDate(from.getDate() + i);
      const key = dayKey(d);
      return { key, label: d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }), value: counts.get(key) || 0 };
    });
  },
};

// ───────── Staff ─────────
export type AdminPartner = Partner & { summary: Summary };
export type AdminCommission = Commission & {
  partner: Pick<Partner, "username" | "code" | "name" | "email" | "payout_method" | "paypal_email" | "bank_details"> | null;
};

export const partnerAdmin = {
  async listPartners(): Promise<AdminPartner[]> {
    const db = supabaseBrowser();
    const [p, s] = await Promise.all([
      db.from("partners").select("*").order("created_at", { ascending: false }).limit(2000),
      db.from("partner_summary").select("*").limit(2000),
    ]);
    if (p.error) throw new Error(p.error.message);
    const sums = new Map((s.data || []).map((x) => [x.partner_id as string, cleanSummary(x)]));
    return (p.data || []).map((x) => {
      const partner = cleanPartner(x);
      return { ...partner, summary: sums.get(partner.id) || cleanSummary({ partner_id: partner.id }) };
    });
  },

  async listCommissions(): Promise<AdminCommission[]> {
    const { data, error } = await supabaseBrowser()
      .from("partner_commissions")
      .select("*, partner:partners(username, code, name, email, payout_method, paypal_email, bank_details)")
      .order("created_at", { ascending: false })
      .limit(2000);
    if (error) throw new Error(error.message);
    return (data || []).map((c) => ({ ...cleanCommission(c), partner: (c as { partner: AdminCommission["partner"] }).partner }));
  },

  async updatePartner(id: string, v: { program: Program; rate: number; discount: number; status: PartnerStatus }): Promise<Result> {
    const { error } = await supabaseBrowser().rpc("admin_update_partner", {
      p_id: id, p_program: v.program, p_rate: v.rate, p_discount: v.discount, p_status: v.status,
    });
    return error ? { error: friendlyError(error.message) } : {};
  },

  async updateCommission(id: string, patch: { status?: CommissionStatus; paid_at?: string | null; payout_ref?: string | null; note?: string | null }): Promise<Result> {
    const { error } = await supabaseBrowser().from("partner_commissions").update(patch).eq("id", id);
    return error ? { error: friendlyError(error.message) } : {};
  },
};
