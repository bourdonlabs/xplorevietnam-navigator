"use client";
import { useEffect, useState } from "react";
import { Building2, CircleCheck, Clock, FileText, Search, Send, Shield, Star } from "lucide-react";
import { backend, type ServiceRequest } from "@/lib/backend";
import { readCheckoutReturn, startCheckout } from "@/lib/checkout";
import { formatLongDate } from "@/lib/journey";
import { SERVICE_CATALOG } from "@/lib/services";
import { usePortal } from "@/components/portal-context";
import {
  Faq, MethodChoice, NextSteps, NumberedSteps, PriceCard, ServiceHeader, StepGuide, WhyCard,
} from "@/components/service-page";

// All copy below comes from John's MST brief (29 Sep 2026) and the website's Tax Code service.
const DOCS = [
  { title: "Tax Registration Declaration (Form No. 05-ĐK-TCT)" },
  { title: "Clear scan of your valid passport", sub: "(along with a certified, legally notarized Vietnamese translation)" },
  { title: "Employment contract or work permit", sub: "(if applicable to your visa type)" },
];

export default function TaxCodePage() {
  const { user } = usePortal();
  const [method, setMethod] = useState("handle");
  const [people, setPeople] = useState(1);
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    readCheckoutReturn();
    backend.listRequests(user.id).then(setRequests);
  }, [user.id]);

  const existing = requests.filter((r) => r.service === "tax_code" && r.status !== "cancelled").at(-1);
  const done = existing
    ? existing.status === "requested"
      ? `Requested on ${formatLongDate(new Date(existing.created_at))}. We'll be in touch by email to confirm and arrange payment.`
      : `Paid on ${formatLongDate(new Date(existing.created_at))}. We'll email you the next steps.`
    : null;

  const buy = async () => {
    setBusy(true);
    if (await startCheckout(user.id, "tax_code", people)) setRequests(await backend.listRequests(user.id));
    setBusy(false);
  };

  return (
    <div className="space-y-8">
      <ServiceHeader
        icon={FileText}
        title="Vietnamese Tax Code Application"
        subtitle="Get your Vietnamese personal tax code (Mã Số Thuế) — the unique identifier for your tax, financial and legal matters in Vietnam."
        chips={[
          { icon: Star, label: "Trusted by 150+ clients" },
          { icon: Clock, label: "Handled start to finish" },
          { icon: Shield, label: "Secure document handling" },
        ]}
      />

      <MethodChoice
        question="How would you like to get your tax code?"
        value={method}
        onChange={setMethod}
        options={[
          { value: "handle", label: "Have XploreVietnam handle it for me" },
          { value: "self", label: "I'll apply myself (through my employer or the tax office)" },
        ]}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="rounded-xl border bg-white p-6 shadow-sm lg:col-span-2">
          <h3 className="text-base font-semibold text-brand-navy">Required Documents</h3>
          <div className="mt-4 space-y-3 rounded-lg bg-brand-tint p-4">
            {DOCS.map((d) => (
              <div key={d.title} className="flex gap-3">
                <CircleCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                <div>
                  <p className="text-base text-brand-navy">{d.title}</p>
                  {d.sub && <p className="text-sm text-brand-ink2">{d.sub}</p>}
                </div>
              </div>
            ))}
            <p className="rounded-md bg-gray-200/70 p-3 text-sm text-brand-navy">
              Upload everything securely inside the app, and we&apos;ll review documents before submission.
            </p>
          </div>

          <h3 className="mt-8 text-base font-semibold text-brand-navy">Process</h3>
          <div className="mt-4">
            <NumberedSteps
              steps={[
                { icon: FileText, title: "Complete the form", text: "Fill out our tax code application form with your personal details and upload your passport." },
                { icon: Send, title: "We register it with the tax office", text: "We handle the registration with the tax office, start to finish." },
                { icon: CircleCheck, title: "Receive your tax code", text: "Your 10-digit tax code is sent to you, ready when you need it." },
              ]}
            />
          </div>
        </div>

        <PriceCard
          price={SERVICE_CATALOG.tax_code.unitUsd}
          caption="One-time fee"
          perPerson
          people={people}
          setPeople={setPeople}
          busy={busy}
          onBuy={buy}
          done={done}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        <Faq
          className="lg:col-span-2"
          items={[
            [
              "What is a tax code (MST) and why do I need one?",
              "The Mã Số Thuế Cá Nhân (MST) is Vietnam's Personal Tax Code, or Tax Identification Number (TIN). It is the foundational unique identifier for your tax, financial and legal matters, and is primarily used for personal income tax (PIT) filings, bank accounts, and employment contracts.",
            ],
            [
              "How do foreigners apply for a tax code?",
              "In one of three ways: through your employer (most common — your company's HR department typically handles the registration on your behalf), directly at the local tax office where you reside or where your income is generated, or online through the General Department of Taxation portal, usually facilitated by your company's tax accountant or a local legal agency.",
            ],
            [
              "What documents do I need to provide?",
              "A Tax Registration Declaration (Form No. 05-ĐK-TCT), your valid passport along with a certified, legally notarized Vietnamese translation, and your employment contract or work permit if applicable to your visa type.",
            ],
            [
              "What does a Vietnamese tax code look like?",
              "Foreigners receive a separate 10-digit tax code. As of late 2025, Vietnamese citizens use their 12-digit Citizen ID instead, but foreigners retain the 10-digit tax code.",
            ],
            ["Do I need a fiscal representative?", "No. Fiscal representation is not required in Vietnam. You can apply directly or via an employer."],
            [
              "Do I need a tax code for a SIM card or everyday purchases?",
              "No. Everyday transactions, like SIM cards, rely on your passport instead.",
            ],
            ["Can I apply for multiple people at once?", "Yes. Choose the number of people before you get started; the fee is $150 per person."],
            [
              "Is my personal information secure?",
              "Yes. Files are encrypted in transit and at rest, stored on GDPR-compliant infrastructure, and only ever accessed by the XploreVietnam team handling your application.",
            ],
          ]}
        />
        <WhyCard
          title="Why Your Tax Code Matters"
          lead="You'll need a tax code for:"
          items={["Personal income tax (PIT) filings", "Opening a Vietnamese bank account", "Employment contracts", "Many banking and employment steps"]}
          bottom="Bottom line: SIM cards and everyday purchases use your passport, but tax, banking and employment need your tax code."
        />
      </div>

      {method === "self" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <StepGuide
              title="Getting a Tax Code Yourself in Vietnam"
              intro="If you are a foreigner moving to or earning income in Vietnam, you can obtain your Mã Số Thuế in one of three ways:"
              steps={[
                {
                  title: "Option 1: Through Your Employer (Most Common)",
                  bullets: [
                    "If you are employed by a Vietnamese entity, your company's HR department will typically handle the registration on your behalf.",
                    "You only need to provide a certified copy of your passport.",
                  ],
                },
                {
                  title: "Option 2: Directly at the Tax Office",
                  bullets: [
                    "If you are a freelancer or have non-employment income, you can register directly at the local tax office where you reside or where your income is generated.",
                    "Bring your Tax Registration Declaration (Form No. 05-ĐK-TCT) and your passport with a certified, legally notarized Vietnamese translation.",
                  ],
                },
                {
                  title: "Option 3: Online",
                  bullets: [
                    "Applications can be submitted digitally through the official General Department of Taxation portal.",
                    "This is usually facilitated by your company's tax accountant or a local legal agency.",
                  ],
                },
              ]}
              aware={[
                "Fiscal representation is not required — you can apply directly or via an employer",
                "Foreigners keep a separate 10-digit tax code; Vietnamese citizens now use their 12-digit Citizen ID",
                "Everyday transactions like SIM cards use your passport, not your tax code",
              ]}
            />
          </div>
        </div>
      )}

      <NextSteps
        subtitle="After getting your tax code, most users complete these essential steps"
        cards={[
          {
            icon: Building2,
            title: "Open Your Bank Account",
            text: "A Vietnamese bank account is how you'll pay rent, receive your salary and use local payment apps.",
            cta: "Learn More",
            href: "/vietnam/bank-account",
          },
          {
            icon: Search,
            title: "Find Your Home in Vietnam",
            text: "Your address must be registered for temporary residence before you apply for a residence card.",
            cta: "Get Started",
            href: "/vietnam/rental-search",
          },
          {
            icon: FileText,
            title: "Review Your Visa Checklist",
            text: "Make sure your visa documents are complete and ready before you apply.",
            cta: "Start Review",
            href: "/vietnam/visa",
          },
        ]}
      />
    </div>
  );
}
