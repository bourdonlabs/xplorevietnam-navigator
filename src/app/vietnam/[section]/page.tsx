"use client";
import Link from "next/link";
import { notFound, useParams } from "next/navigation";
import { ArrowUpRight, Check, Clock } from "lucide-react";
import { usePortal } from "@/components/portal-context";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { VISA_TYPES } from "@/lib/journey";
import { SUPPORT_EMAIL, cn, siteLink } from "@/lib/utils";

// Individual services: copy and prices are the ones on the website's Navigator section.
type Service = { name: string; price: string; note?: string; text: string };
const SERVICES: Record<string, Service> = {
  "tax-code": {
    name: "Tax Code",
    price: "$150",
    text: "Your personal tax code (MST) is needed to file taxes in Vietnam, and for many banking and employment steps. We handle the registration with the tax office, start to finish, so it’s ready when you need it.",
  },
  "bank-account": {
    name: "Bank Account",
    price: "$325",
    text: "A Vietnamese bank account is how you’ll pay rent, receive your salary and use local payment apps. We prepare your documents and book your appointment with a bank that works well with foreigners, so it’s done in one visit.",
  },
  review: {
    name: "Visa Packet Review",
    price: "$595",
    note: "(+$125/dependent)",
    text: "Have our visa experts review your documents before you apply — get a written assessment within 3 business days plus a 30-minute expert call, ideal for movers who want confidence in their paperwork without full-service support.",
  },
};

type Page = { title: string; intro: string; service?: string; site?: { label: string; path: string }; soon?: string };
const PAGES: Record<string, Page> = {
  visa: { title: "Visa Checklists", intro: "The documents and steps for each visa route, based on the rules as we understand them in 2026." },
  "tax-code": { title: "Tax Code", intro: "Get your Vietnamese personal tax code (MST) without the trip to the tax office.", service: "tax-code" },
  "bank-account": { title: "Bank Account", intro: "Open a Vietnamese bank account in one visit.", service: "bank-account" },
  "relocation-packages": {
    title: "Relocation Packages",
    intro: "We offer three levels of service. However much support you would like, we can deliver.",
  },
  "rental-search": {
    title: "Rental Search",
    intro: "Find a place to live before you land.",
    soon: "Rental search is coming to Navigator.",
    site: { label: "Read our real estate and rentals guide", path: "real-estate.html" },
  },
  consultation: {
    title: "Book Your Free Consultation",
    intro: "Schedule a free, no-obligation consultation with an XploreVietnam relocation specialist.",
    soon: "The booking calendar is being connected.",
    site: { label: "Book on our website", path: "get-started.html" },
  },
  "cost-of-living": {
    title: "Cost of Living",
    intro: "Compare Vietnamese cities to your current home.",
    soon: "The calculator is coming to Navigator.",
    site: { label: "Read our cost of living guide", path: "cost-of-living.html" },
  },
  checklist: {
    title: "Pre-Arrival Checklist",
    intro: "All of the little things you need to remember in the lead up to your move.",
    soon: "Your pre-arrival checklist is coming to Navigator.",
  },
  schools: {
    title: "Schools",
    intro: "International and bilingual schools for your family.",
    soon: "The school finder is coming to Navigator.",
    site: { label: "Read our schools and childcare guide", path: "schools.html" },
  },
  partners: { title: "Partners", intro: "Our vetted network of local experts.", soon: "The partner list is coming to Navigator." },
  guides: {
    title: "Expert Guides",
    intro: "Expert-written guides to help you avoid common mistakes, save time, and move with confidence.",
    soon: "Downloadable guides are coming to Navigator.",
    site: { label: "Browse our Vietnam guides", path: "guide.html" },
  },
};

const PACKAGES = [
  { name: "Visa Package", types: "E-visa · Work · Investor · Family", price: "$975", best: "People who are confident managing their own move but want an expert handling the immigration process." },
  { name: "Get to Vietnam Package", types: "Work · Investor · Family", price: "$2450", badge: "Best Value", best: "People who want the critical parts handled by experts and are comfortable managing the day-to-day of the move themselves." },
  { name: "Concierge Package", types: "Work · Investor · Family", price: "$4750", best: "Families, couples, and professionals who want one trusted person handling the entire move — not a checklist to manage themselves." },
];

// Requirements per route, word for word from the website's visas page.
const CHECKLISTS: Record<string, { title: string; lead: string; items: string[] }> = {
  evisa: {
    title: "E-Visa",
    lead: "Citizens of every country can apply online for an e-visa valid for up to 90 days, with single or multiple entry.",
    items: [
      "A valid passport",
      "Government fee: USD 25 (single entry) or USD 50 (multiple entry)",
      "Processing: usually a few working days when the application is complete",
      "Not allowed: working for a Vietnamese employer, applying for a TRC, staying beyond the dates on the visa",
    ],
  },
  work: {
    title: "Work Permit and Work Visa (LĐ)",
    lead: "If you are employed by a Vietnamese company, this is your route.",
    items: [
      "A job offer from a Vietnamese employer that has registered its need for foreign workers",
      "A health check certificate",
      "A criminal record check, usually from your home country and legalised",
      "Proof of qualifications or experience, such as a degree and work references, legalised and translated",
      "A valid passport",
    ],
  },
  investor: {
    title: "Investor Visa (ĐT) and Residence Card",
    lead: "The capital must be contributed to a Vietnamese company. Money sitting in a bank account does not count.",
    items: [
      "ĐT1: investment of VND 100 billion or more; visa up to 5 years, TRC up to 10 years",
      "ĐT2: VND 50 billion to under 100 billion; visa up to 5 years, TRC up to 5 years",
      "ĐT3: VND 3 billion to under 50 billion; visa up to 3 years, TRC up to 3 years",
      "ĐT4: under VND 3 billion; visa up to 12 months, no TRC",
    ],
  },
  family: {
    title: "Family Visa (TT)",
    lead: "For spouses and children of Vietnamese citizens or of foreigners holding a work, investor or similar visa.",
    items: [
      "Proof of the relationship, such as a marriage or birth certificate, legalised and translated",
      "A sponsor: your Vietnamese spouse or parent, or the visa-holding family member’s employer or company",
      "Proof of residence registration in Vietnam",
    ],
  },
};

function ServiceCard({ id }: { id: string }) {
  const s = SERVICES[id];
  return (
    <Card id={id} className="scroll-mt-6 border-0 shadow-sm">
      <CardContent className="flex flex-col gap-6 pt-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-xl font-semibold text-brand-navy">{s.name}</h2>
          <p className="mt-2 text-[15px] leading-relaxed text-brand-ink2">{s.text}</p>
        </div>
        <div className="flex flex-shrink-0 flex-col items-start gap-3 sm:items-end">
          <p className="text-3xl font-bold text-brand-navy">
            {s.price} {s.note && <span className="text-sm font-normal text-gray-500">{s.note}</span>}
          </p>
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(s.name + " request")}`}
            className={buttonClass("cta")}
          >
            Request this service
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function SectionPage() {
  const { section } = useParams<{ section: string }>();
  const { profile } = usePortal();
  const page = PAGES[section];
  if (!page) notFound();

  const mine = profile?.visa_type && CHECKLISTS[profile.visa_type] ? profile.visa_type : null;
  const order = mine ? [mine, ...Object.keys(CHECKLISTS).filter((k) => k !== mine)] : Object.keys(CHECKLISTS);

  return (
    <>
      <div className="space-y-3">
        <h1 className="text-left text-4xl font-bold text-brand-navy">{page.title}</h1>
        <p className="max-w-3xl text-left text-lg leading-relaxed text-brand-navy">{page.intro}</p>
      </div>

      {page.service && <ServiceCard id={page.service} />}

      {section === "visa" && (
        <>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {order.map((k) => {
              const c = CHECKLISTS[k];
              return (
                <Card key={k} className={cn("border-2 shadow-sm", k === mine ? "border-primary" : "border-transparent")}>
                  <CardContent className="pt-6">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-brand-navy">{c.title}</h2>
                      {k === mine && (
                        <span className="flex-shrink-0 whitespace-nowrap rounded-full bg-brand-tint px-2.5 py-0.5 text-xs font-medium text-primary">Your route</span>
                      )}
                    </div>
                    <p className="mb-4 text-sm leading-relaxed text-brand-ink2">{c.lead}</p>
                    <ul className="space-y-2">
                      {c.items.map((i) => (
                        <li key={i} className="flex gap-2 text-sm text-brand-navy">
                          <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#10B981]" />
                          {i}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {!mine && profile?.visa_type === "unsure" && (
            <p className="text-sm text-gray-600">
              Not sure which route fits? {VISA_TYPES.find((v) => v.value === "unsure")?.sub}.{" "}
              <Link href="/vietnam/consultation" className="text-primary hover:underline">Book a free consultation</Link>
            </p>
          )}
          <ServiceCard id="review" />
        </>
      )}

      {section === "relocation-packages" && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {PACKAGES.map((p) => (
            <Card key={p.name} className={cn("relative flex flex-col border-2 shadow-sm", p.badge ? "border-brand-gold" : "border-transparent")}>
              {p.badge && (
                <span className="absolute -top-3 left-6 rounded-full bg-gradient-to-br from-[#F9DB7B] via-[#E8B21A] to-[#D49A0B] px-3 py-1 text-xs font-semibold text-brand-navy">
                  {p.badge}
                </span>
              )}
              <CardContent className="flex flex-1 flex-col pt-6">
                <h2 className="text-xl font-semibold text-brand-navy">{p.name}</h2>
                <p className="mt-1 text-sm text-gray-500">{p.types}</p>
                <p className="mt-4 text-sm leading-relaxed text-brand-ink2">
                  <strong className="text-brand-navy">Best for:</strong> {p.best}
                </p>
                <p className="mt-6 text-3xl font-bold text-brand-navy">
                  {p.price} <span className="text-sm font-normal text-gray-500">/total</span>
                </p>
                <a href={siteLink("relocate.html#packages")} target="_blank" rel="noopener" className={cn(buttonClass("cta"), "mt-6")}>
                  See what’s included <ArrowUpRight />
                </a>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {page.soon && (
        <Card className="border-0 shadow-sm">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <p className="text-gray-600">{page.soon}</p>
            {page.site && (
              <a href={siteLink(page.site.path)} target="_blank" rel="noopener" className={buttonClass("outline")}>
                {page.site.label} <ArrowUpRight />
              </a>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
