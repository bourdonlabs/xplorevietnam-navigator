// Service agreements for the website checkout. A customer reads and e-signs one agreement per kind of product
// before they can pay. The text lives here (server side) so what is shown, what is signed and what is stored are
// always the same words: the browser only ever sends which items are in the cart.
//
// DRAFT NOTICE: this wording is a starting draft built from the website's package descriptions, the Terms & Conditions
// and the Refund Policy. It has not been reviewed by a lawyer. Live payments stay blocked until the company details
// below are filled in (Vercel env vars) and AGREEMENTS_REVIEWED=1 is set. See agreementsReady().
import { createHash } from "node:crypto";
import { esc } from "./mailer";
import { itemInfo, type CartLine } from "./shop";

export type Block = string | string[] | { h3: string }; // paragraph | bullet list | small heading
export type Section = { h: string; body: Block[] };
export type DocLine = {
  sku: string;
  name: string;
  dependents: number;
  options: Record<string, string>;
  addons: { name: string; price: number }[];
  total: number; // price incl. dependents and add-ons
  now: number; // charged at booking
  later: number; // balance after filing
  fees?: string;
};
export type AgreementDoc = {
  key: string;
  version: string;
  title: string;
  subtitle: string;
  sections: Section[];
  lines: DocLine[];
  cart_hash: string;
  sha256: string;
};

/** Bump when the wording of an agreement changes, so each signature records which text it was. */
const VERSION = "2026-10-18-draft1";

const env = (k: string, placeholder: string) => process.env[k]?.trim() || placeholder;
export const COMPANY = {
  name: env("AGREEMENT_COMPANY_NAME", "[Company legal name]"),
  address: env("AGREEMENT_COMPANY_ADDRESS", "[Company address]"),
  law: env("AGREEMENT_GOVERNING_LAW", "[governing law and courts]"),
};
/** True only when the company details are filled in AND someone has confirmed a lawyer reviewed the text. */
export const agreementsReady = () =>
  process.env.AGREEMENTS_REVIEWED === "1" && ![COMPANY.name, COMPANY.address, COMPANY.law].some((v) => v.startsWith("["));

export const CONSENT =
  "I consent to use my electronic signature on documents, including legally binding contracts, as a digital representation of my signature, just like pen and paper.";
export const agreeText = (name: string) =>
  `I, ${name}, have read this agreement and agree to be legally bound by it, together with the Terms & Conditions and the Refund Policy.`;

type Def = { key: string; title: string; skus: string[]; extra: (lines: DocLine[]) => Section[] };

// What each product includes, taken from the product pages. Keep in step with website/src/data/services.py and the pages.
const RL_COMMON = [
  "Visa application preparation and review",
  "Document legalisation and translation guidance",
  "In-person support at the immigration office",
  "XploreVietnam client tracker",
  "Connections to XploreVietnam's partner network",
  "Relocation guides on shipping, pet relocation, housing and more",
  "Vietnam cost of living guide",
];
const INCLUDES: Record<string, string[]> = {
  "rl-visa": [
    "Choosing the visa route that fits your circumstances",
    "Preparing your documents to the standard the immigration office requires",
    "Filing your application",
    "Following your application up with the immigration office until a decision is issued",
  ],
  "rl-get-to-vietnam": [...RL_COMMON, "Rental search support", "A dedicated relocation specialist", "Four 30-minute one-on-one coaching calls"],
  "rl-concierge": [
    ...RL_COMMON,
    "Rental search support",
    "A dedicated relocation specialist",
    "Unlimited coaching calls",
    "Vietnamese tax code (MST), Vietnamese bank account and driving licence conversion",
    "Utilities set-up (electric, water, internet, phone)",
    "Airport pickup",
    "Medical planning support",
    "Temporary residence registration",
    "Access to the Concierge WhatsApp line",
  ],
  "rl-trc-renewal": [
    "Management of your Temporary Residence Card renewal from start to finish",
    "Full document preparation and submission to the immigration office",
    "Follow-up until your new card is issued",
  ],
  "svc-visas-1": ["Full management of your visa or extension from start to finish: the right visa type, documents, submission, follow-up with the immigration office and collection"],
  "svc-visas-2": [
    "Everything in the Visa Package",
    "Two coaching calls",
    "Temporary residence registration",
    "SIM card and bank account setup",
    "30 days of post-arrival support",
  ],
  "svc-visas-3": [
    "Everything in the Visa + Stay Package",
    "Unlimited calls",
    "Airport pickup",
    "Apartment search",
    "In-person support at every office visit",
    "A dedicated WhatsApp line",
  ],
  "svc-trc-1": ["Eligibility check", "Document list, translations and notarisation", "Submission to the immigration office", "Collection of your card"],
  "svc-trc-2": ["Everything in the TRC Package", "Your work permit or exemption", "Legalisation of your degree and criminal record", "Employer paperwork"],
  "svc-trc-3": [
    "Everything in the TRC + Permit Package",
    "Family cards",
    "School registration support",
    "Housing search",
    "A dedicated case manager",
  ],
  "teach-in-vietnam": [
    "120-hour in-class TESOL course (TQUK Level 5 Certificate) in Thailand",
    "Guaranteed teaching job in Vietnam, or a free relocation to a teaching position in Thailand, Cambodia, South Korea, Japan or Costa Rica (conditions below)",
    "Visa and document support",
    "Housing search and setup assistance",
    "Pre-departure guidance and checklist",
    "Local orientation and settling-in advice",
    "Community access for teachers in the region",
    "Airport limousine pick-up",
  ],
  "overstay-review": [
    "Review of your passport, visa and entry history by an immigration law expert from our partner network",
    "A clear written plan: fines, documents and the safest way to resolve your situation",
    "A fixed quote if you want us to handle the case for you",
  ],
};

const DEFS: Def[] = [
  {
    key: "relocation-package",
    title: "Relocation Package Agreement",
    skus: ["rl-visa", "rl-get-to-vietnam", "rl-concierge"],
    extra: () => [
      {
        h: "Dependents and optional extras",
        body: [
          "Dependents are covered only if they are listed in your order below. Add-ons such as a tax code, a bank account or a driving licence conversion are provided only if they are listed in your order or included in your package. Whether a bank opens an account, or an office converts a licence, is decided by that bank or office.",
        ],
      },
    ],
  },
  {
    key: "stay-renewal",
    title: "Residence Card Renewal Agreement",
    skus: ["rl-trc-renewal"],
    extra: () => [],
  },
  {
    key: "visa-services",
    title: "Visa and Extension Services Agreement",
    skus: ["svc-visas-1", "svc-visas-2", "svc-visas-3"],
    extra: () => [
      {
        h: "Dependents",
        body: ["Dependents are covered only if they are listed in your order below. Each dependent needs their own application and documents."],
      },
    ],
  },
  {
    key: "trc-services",
    title: "Temporary Residence Card Services Agreement",
    skus: ["svc-trc-1", "svc-trc-2", "svc-trc-3"],
    extra: () => [
      {
        h: "Eligibility and dependents",
        body: [
          "A Temporary Residence Card is available only to people who qualify, usually through a work permit, an investment in a Vietnamese company or a close family link. We check your eligibility at the start. Dependents are covered only if they are listed in your order below.",
        ],
      },
    ],
  },
  {
    key: "teach-in-vietnam",
    title: "Teach in Vietnam Package Agreement",
    skus: ["teach-in-vietnam"],
    extra: () => [
      {
        h: "Job guarantee",
        body: [
          "We guarantee you a teaching job once you complete your TESOL, get your degree legalised, and file your visa, work permit and Temporary Residence Card in the right order and on time. If we cannot place you in Vietnam for any reason, we will relocate you for free to a teaching position in Thailand, Cambodia, South Korea, Japan or Costa Rica.",
          "The guarantee depends on you meeting the conditions above and giving us accurate and genuine documents. It is the one exception to the rule that we cannot guarantee decisions made by the authorities.",
        ],
      },
      {
        h: "Course fees and travel",
        body: [
          "TESOL course fees are paid to the course provider and are not refundable once the course has started. Your travel costs to and from the course are your own unless your order says otherwise.",
        ],
      },
    ],
  },
  {
    key: "overstay-review",
    title: "Overstay Case Review Agreement",
    skus: ["overstay-review"],
    extra: () => [
      {
        h: "What the review covers",
        body: [
          "The review fee covers the assessment only. Government fines and the cost of handling your case are separate, and we quote them upfront once your case has been reviewed. You are under no obligation to instruct us to handle your case.",
          "The review is general guidance based on what you tell us and the documents you send. It does not create a lawyer-client relationship unless you later instruct a lawyer in our partner network in writing.",
        ],
      },
    ],
  },
];

const BY_SKU = new Map<string, Def>(DEFS.flatMap((d) => d.skus.map((s) => [s, d] as const)));
export const agreementKeyFor = (sku: string) => BY_SKU.get(sku)?.key ?? null;

const usd = (n: number) => "$" + n.toLocaleString("en-US");
const sha = (v: unknown) => createHash("sha256").update(typeof v === "string" ? v : JSON.stringify(v)).digest("hex");

function toDocLine(l: CartLine): DocLine {
  const addonTotal = l.addons.reduce((s, a) => s + a.price, 0);
  const price = l.price ?? 0;
  const first = Math.round(price * l.deposit);
  return {
    sku: l.sku,
    name: l.name,
    dependents: l.dependents,
    options: l.options,
    addons: l.addons.map((a) => ({ name: a.name, price: a.price })),
    total: price + addonTotal,
    now: first + addonTotal,
    later: price - first,
    fees: itemInfo(l.sku)?.fees,
  };
}

function lineLabel(l: DocLine) {
  const bits = [l.options.visa_type, l.dependents ? `${l.dependents} dependent${l.dependents > 1 ? "s" : ""}` : "", ...l.addons.map((a) => a.name)].filter(Boolean);
  return bits.length ? `${l.name} (${bits.join(", ")})` : l.name;
}

function sectionsFor(def: Def, lines: DocLine[]): Section[] {
  const scope: Block[] = [];
  for (const l of lines) {
    scope.push({ h3: l.name });
    scope.push(INCLUDES[l.sku] || []);
    if (l.options.visa_type) scope.push(`Visa type chosen: ${l.options.visa_type}.`);
  }
  scope.push("What is included is what the product page on xplorevietnam.org described on the day you ordered, as listed above. Anything not listed is not included.");

  const twoPart = lines.some((l) => l.later > 0);
  const noted = lines.filter((l) => l.fees);
  const feeBody: Block[] = [
    "All prices are in US dollars. Your order is:",
    lines.map((l) => {
      const parts = l.later > 0 ? `${usd(l.now)} at booking, ${usd(l.later)} after your application is submitted` : "paid in full at booking";
      return `${lineLabel(l)}: ${usd(l.total)} (${parts})`;
    }),
    ...(twoPart
      ? [
          "Where an order is paid in two parts, the first part is charged when you book and the balance is due when we file your application. We will send you a secure payment link for the balance. If the balance is not paid when due, we may pause work on your case until it is.",
        ]
      : []),
    "Government and official fees are paid at cost to the Vietnamese authorities and are not included in our price unless your order says so.",
    ...(noted.length ? ["Fee notes for your order:", noted.map((l) => `${l.name}: ${l.fees}`)] : []),
    "Payments are processed securely by Stripe. Your bank may charge its own card or currency-conversion fees.",
  ];

  return [
    {
      h: "Purpose of this agreement",
      body: [
        `This agreement sets out what we will do for you, what we need from you and how payment works for the order in section 4. It forms part of, and should be read with, our Terms & Conditions and Refund Policy on xplorevietnam.org. If anything here conflicts with them, this agreement applies to this order.`,
      ],
    },
    {
      h: "About us",
      body: [
        `XploreVietnam is operated by ${COMPANY.name}, ${COMPANY.address} ("XploreVietnam", "we", "us"). We coordinate immigration, relocation and related services in Vietnam. Where a service needs a licensed professional, such as a lawyer or a notary, that professional is an independent provider (see "Independent providers" below).`,
      ],
    },
    { h: "What is included", body: scope },
    { h: "Your order and fees", body: feeBody },
    ...def.extra(lines),
    {
      h: "No guarantee of outcome",
      body: [
        "Visas, work permits, residence cards and other permissions are decided by the Vietnamese authorities. We cannot guarantee that an application will be approved or how long it will take. Any timeline we give is an estimate. Rules, fees and procedures change often and are applied by the office that handles your case.",
        "If an application is refused because of a mistake on our side, we file again once at no extra service fee, as the Refund Policy sets out.",
      ],
    },
    {
      h: "Your responsibilities",
      body: [
        "You agree to:",
        [
          "give us information and documents that are accurate, complete and genuine",
          "tell us about anything in your history that could affect an application, such as a past overstay, refusal or criminal record",
          "keep your passport valid for the period the authority requires and reply to our requests promptly",
          "follow Vietnamese law while you are in Vietnam, including the rules on working without a permit",
        ],
        "Delays or refusals caused by missing, expired or inaccurate documents are outside our control.",
      ],
    },
    {
      h: "Independent providers",
      body: [
        "Lawyers, notaries, translators, schools, banks and other providers that we introduce or work with are independent businesses and not part of XploreVietnam. Where they do work for you, your agreement for that work is with them. We choose them with care but do not guarantee their work, and we do not refund anything you pay them directly.",
      ],
    },
    {
      h: "Cancellation and refunds",
      body: [
        "You can cancel at any time by emailing info@xplorevietnam.org with your name and the email address you used to pay. What you get back depends on how far your case has gone and is set out in the Refund Policy in force on the day you pay, which is part of this agreement. In short: the earlier you cancel, the more you get back, and once your application has been filed our service fee is not refundable.",
      ],
    },
    {
      h: "Privacy and your documents",
      body: [
        "We use your personal information and documents only to deliver your service, to meet our legal duties and to keep proper records. To do the work we share them with the authorities and partners involved in your case, such as translators, notaries and lawyers. Our Privacy Policy explains how we handle your data and your rights.",
      ],
    },
    {
      h: "Our liability",
      body: [
        "To the extent the law allows, we are not responsible for decisions or delays of government offices, for losses caused by inaccurate information or documents you give us, or for indirect losses. Our total liability for any claim connected with this agreement is limited to the service fees you paid us for this order.",
        "Nothing in this agreement limits liability that the law does not allow us to limit, or any rights you have under the consumer laws where you live.",
      ],
    },
    {
      h: "Communication",
      body: ["We communicate with you by email and WhatsApp, using the contact details you gave us. Please tell us if they change."],
    },
    {
      h: "Electronic signature and records",
      body: [
        "By signing below you agree that your electronic signature has the same effect as a handwritten signature, and that we may keep a record of this signed agreement, including the date and time, your name, email address and IP address. We accept this agreement when we confirm your payment, and we will email you a copy then.",
      ],
    },
    {
      h: "Governing law and disputes",
      body: [
        `This agreement is governed by the law of ${COMPANY.law}. If we disagree, we will first try to settle it in good faith by email.`,
      ],
    },
    {
      h: "Entire agreement and changes",
      body: [
        "This agreement, together with the Terms & Conditions, Refund Policy and Privacy Policy in force on the day you sign, is the whole agreement between us for this order. It can be changed only in writing agreed by both of us.",
      ],
    },
  ];
}

/** Builds the agreements a cart needs: one document per kind of product, covering only that kind's priced lines. */
export function buildDocuments(lines: CartLine[]): AgreementDoc[] {
  const groups = new Map<string, { def: Def; lines: DocLine[] }>();
  for (const l of lines) {
    if (l.price == null) continue;
    const def = BY_SKU.get(l.sku);
    if (!def) continue;
    const g = groups.get(def.key) || { def, lines: [] };
    g.lines.push(toDocLine(l));
    groups.set(def.key, g);
  }
  return [...groups.values()].map(({ def, lines: dl }) => {
    const sections = sectionsFor(def, dl);
    const cart_hash = sha(
      [...dl].sort((a, b) => a.sku.localeCompare(b.sku)).map((l) => ({ sku: l.sku, d: l.dependents, o: l.options, a: l.addons.map((x) => x.name).sort(), t: l.total, n: l.now })),
    );
    return {
      key: def.key,
      version: VERSION,
      title: def.title,
      subtitle: `Service agreement between ${COMPANY.name} ("XploreVietnam") and you`,
      sections,
      lines: dl,
      cart_hash,
      sha256: sha(sections),
    };
  });
}

type Db = { from: (t: string) => any };

/** Confirms every agreement this cart needs has been signed by this email, for these exact items, recently and unused. */
export async function verifyAgreements(db: Db, lines: CartLine[], ids: unknown, email: string) {
  const need = buildDocuments(lines);
  const wanted = (Array.isArray(ids) ? ids : []).filter((x): x is string => typeof x === "string" && /^[0-9a-f-]{36}$/i.test(x)).slice(0, 12);
  if (!need.length) return { ok: true as const, ids: [] as string[] };
  if (!wanted.length) return { ok: false as const, missing: need.map((d) => d.key) };
  const { data } = await db
    .from("signed_agreements")
    .select("id, agreement_key, signer_email, cart_hash, stripe_session_id, created_at")
    .in("id", wanted);
  const rows: { id: string; agreement_key: string; signer_email: string; cart_hash: string; stripe_session_id: string | null; created_at: string }[] = data || [];
  const fresh = Date.now() - 12 * 3600 * 1000;
  const used: string[] = [];
  const missing: string[] = [];
  for (const d of need) {
    const r = rows.find(
      (x) => x.agreement_key === d.key && x.cart_hash === d.cart_hash && x.signer_email === email && !x.stripe_session_id && Date.parse(x.created_at) > fresh,
    );
    if (r) used.push(r.id);
    else missing.push(d.key);
  }
  return missing.length ? { ok: false as const, missing } : { ok: true as const, ids: used };
}

const blockHtml = (b: Block) =>
  typeof b === "string"
    ? `<p style="margin:0 0 10px;font-size:14px;line-height:1.55;color:#090825">${esc(b)}</p>`
    : Array.isArray(b)
      ? `<ul style="margin:0 0 10px;padding-left:20px;font-size:14px;line-height:1.55;color:#090825">${b.map((x) => `<li style="margin:0 0 4px">${esc(x)}</li>`).join("")}</ul>`
      : `<p style="margin:14px 0 6px;font-size:14px;font-weight:bold;color:#090825">${esc(b.h3)}</p>`;

export const blockText = (b: Block) => (typeof b === "string" ? b : Array.isArray(b) ? b.map((x) => `- ${x}`).join("\n") : b.h3.toUpperCase());

/** A signed agreement as HTML (for emails): the full text, then who signed it and when. */
export function signedAgreementHtml(
  doc: { title: string; subtitle: string; sections: Section[] },
  s: { name: string; email: string; signedAt: string; version: string; id: string },
) {
  return (
    `<div style="margin:22px 0 0;padding:18px 18px 8px;border:1px solid #e3e7ec;border-radius:8px">` +
    `<p style="margin:0 0 4px;font-size:16px;font-weight:bold;color:#090825">${esc(doc.title)}</p>` +
    `<p style="margin:0 0 14px;font-size:12px;color:#6b7a8a">${esc(doc.subtitle)}</p>` +
    doc.sections.map((sec, i) => `<p style="margin:16px 0 6px;font-size:14px;font-weight:bold;color:#090825">${i + 1}. ${esc(sec.h)}</p>${sec.body.map(blockHtml).join("")}`).join("") +
    `<p style="margin:18px 0 12px;padding:12px 14px;background:#f5f7fa;border-left:4px solid #FF2D3B;border-radius:4px;font-size:13px;line-height:1.5;color:#090825">` +
    `Signed electronically by <b>${esc(s.name)}</b> (${esc(s.email)}) on ${esc(s.signedAt)}.<br>Agreement version ${esc(s.version)}. Reference ${esc(s.id)}.</p></div>`
  );
}

export function signedAgreementText(
  doc: { title: string; subtitle: string; sections: Section[] },
  s: { name: string; email: string; signedAt: string; version: string; id: string },
) {
  return (
    `${doc.title}\n${doc.subtitle}\n\n` +
    doc.sections.map((sec, i) => `${i + 1}. ${sec.h}\n${sec.body.map(blockText).join("\n")}`).join("\n\n") +
    `\n\nSigned electronically by ${s.name} (${s.email}) on ${s.signedAt}. Version ${s.version}. Reference ${s.id}.`
  );
}
