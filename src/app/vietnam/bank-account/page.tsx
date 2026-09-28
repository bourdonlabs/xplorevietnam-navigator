"use client";
import { useEffect, useState } from "react";
import { AlertTriangle, Building2, Check, Clock, FileText, Search, Shield, Star } from "lucide-react";
import { backend, type ServiceRequest } from "@/lib/backend";
import { readCheckoutReturn, startCheckout } from "@/lib/checkout";
import { formatLongDate } from "@/lib/journey";
import { SERVICE_CATALOG } from "@/lib/services";
import { usePortal } from "@/components/portal-context";
import {
  Faq, MethodChoice, NextSteps, NumberedSteps, PriceCard, ServiceHeader, StepGuide, WhyCard,
} from "@/components/service-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Bank-specific facts John still has to confirm. Everything else is the website's own wording.
const BANK = {
  name: "[Partner bank name]",
  about: "[One line about the bank: size, branches, English support]",
  fees: ["[Initial deposit, if any]", "[Monthly account fee]", "[Card / transfer fees]"],
  timeline: "[Processing time]",
};

const SITE_LINE =
  "A Vietnamese bank account is how you'll pay rent, receive your salary and use local payment apps. We prepare your documents and book your appointment with a bank that works well with foreigners, so it's done in one visit.";

// General requirements at Vietnamese banks; each bank sets its own list.
const DOCUMENTS = [
  "Valid passport",
  "Valid visa or Temporary Residence Card",
  "Proof of your address in Vietnam (temporary residence registration)",
  "A Vietnamese phone number, for SMS and banking-app verification",
  "Your employment contract, if you're opening a salary account",
];

export default function BankAccountPage() {
  const { user } = usePortal();
  const [method, setMethod] = useState("guide");
  const [busy, setBusy] = useState(false);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);

  useEffect(() => {
    readCheckoutReturn();
    backend.listRequests(user.id).then(setRequests);
  }, [user.id]);

  const existing = requests.filter((r) => r.service === "bank_account" && r.status !== "cancelled").at(-1);
  const done = existing
    ? existing.status === "requested"
      ? `Requested on ${formatLongDate(new Date(existing.created_at))}. We'll be in touch by email to confirm and arrange payment.`
      : `Paid on ${formatLongDate(new Date(existing.created_at))}. We'll email you the next steps.`
    : null;

  const buy = async () => {
    setBusy(true);
    if (await startCheckout(user.id, "bank_account")) setRequests(await backend.listRequests(user.id));
    setBusy(false);
  };

  const box = "rounded-xl border border-brand-tint-line bg-brand-tint p-6";

  return (
    <div className="space-y-8">
      <ServiceHeader
        icon={Building2}
        title="Vietnam Bank Account"
        subtitle="Skip the paperwork guesswork. We prepare your documents and book your appointment with a bank that works well with foreigners, so it's done in one visit."
        chips={[
          { icon: Star, label: "Trusted by 150+ clients" },
          { icon: Clock, label: "Done in one visit" },
          { icon: Shield, label: "Secure document handling" },
        ]}
      />

      <MethodChoice
        question="How would you like to open your bank account?"
        value={method}
        onChange={setMethod}
        options={[
          { value: "guide", label: "Have XploreVietnam guide the process" },
          { value: "self", label: "I'll visit a bank on my own" },
        ]}
      />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        <Tabs key={method} defaultValue={method === "self" ? "diy" : "service"} className="lg:col-span-2">
          <TabsList className="grid h-auto w-full grid-cols-3">
            <TabsTrigger value="service" className="px-1 py-2 text-xs sm:text-sm">Get Bank Account</TabsTrigger>
            <TabsTrigger value="documents" className="px-1 py-2 text-xs sm:text-sm">Documents</TabsTrigger>
            <TabsTrigger value="diy" className="px-1 py-2 text-xs sm:text-sm">DIY in Person</TabsTrigger>
          </TabsList>

          <TabsContent value="service" className="mt-2">
            <div className="space-y-6 rounded-xl border bg-white p-6 shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-brand-navy">Service Overview</h2>
                <p className="mt-4 text-base leading-relaxed text-primary">
                  A fully guided bank account setup with a bank that works well with foreigners.
                </p>
              </div>
              <p className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-primary">
                <AlertTriangle className="h-4 w-4 flex-shrink-0 text-brand-navy" /> Processing time: {BANK.timeline}
              </p>
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className={box}>
                  <h3 className="text-xl font-semibold text-brand-navy">Bank</h3>
                  <p className="mt-4 text-base font-semibold text-primary">{BANK.name}</p>
                  <p className="mt-4 text-base leading-relaxed text-brand-ink2">{BANK.about}</p>
                </div>
                <div className={box}>
                  <h3 className="text-xl font-semibold text-brand-navy">Payments and Fees</h3>
                  <ul className="mt-4 list-disc space-y-3 pl-5 text-base leading-relaxed text-brand-ink2">
                    {BANK.fees.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className={box}>
                <h3 className="text-xl font-semibold text-brand-navy">What&apos;s Included in the Service</h3>
                <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-3 text-base text-brand-ink2 sm:grid-cols-2">
                  {[
                    "Document preparation",
                    "Appointment booked with a bank that works well with foreigners",
                    "Account opened in one visit",
                  ].map((t) => (
                    <li key={t} className="flex gap-3">
                      <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#10B981]" />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border p-6">
                <h3 className="text-xl font-semibold text-brand-navy">Process Timeline</h3>
                <p className="mt-2 text-sm text-gray-600">What happens after you complete payment</p>
                <p className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-brand-ink2">
                  <Clock className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-navy" />
                  <span>
                    <strong className="text-brand-navy">Total Estimated Timeline:</strong> {BANK.timeline}
                  </span>
                </p>
                <div className="mt-4">
                  <NumberedSteps
                    steps={[
                      { title: "Document Upload & Review", text: "Upload your documents for review." },
                      { title: "Appointment Booked", text: "We book your appointment with a bank that works well with foreigners." },
                      { title: "Visit the Bank", text: "Bring your documents to your appointment. Your account is opened in one visit." },
                      { title: "Account Active", text: "Pay rent, receive your salary and use local payment apps." },
                    ]}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="documents" className="mt-2">
            <div className="rounded-xl border bg-white p-6 shadow-sm">
              <h2 className="text-2xl font-bold text-brand-navy">Documents You&apos;ll Need</h2>
              <p className="mt-3 text-sm text-gray-600">Each bank sets its own list. We confirm the exact requirements with the bank before your appointment.</p>
              <ul className="mt-5 space-y-3">
                {DOCUMENTS.map((d) => (
                  <li key={d} className="flex gap-3 rounded-lg bg-brand-tint p-3 text-base text-brand-navy">
                    <Check className="mt-1 h-4 w-4 flex-shrink-0 text-[#10B981]" />
                    {d}
                  </li>
                ))}
              </ul>
            </div>
          </TabsContent>

          <TabsContent value="diy" className="mt-2">
            <StepGuide
              title="Opening a Bank Account in Person in Vietnam"
              intro="If you're already in Vietnam, you can open an account yourself at a bank branch. Here's how the process typically works:"
              steps={[
                { title: "Step 1: Choose a Bank", bullets: ["Pick a bank with branches near where you live and staff used to foreign customers."] },
                { title: "Step 2: Prepare Your Documents", bullets: DOCUMENTS },
                { title: "Step 3: Visit a Branch", bullets: ["Bring the originals of your documents", "Language support is not guaranteed at every branch"] },
                { title: "Step 4: Activate Your Account", bullets: ["Set up the bank's mobile app with your Vietnamese phone number", "Collect or activate your debit card"] },
              ]}
              aware={["Requirements vary from bank to bank and branch to branch", "Some banks ask for a minimum remaining visa validity"]}
            />
          </TabsContent>
        </Tabs>

        <div className="space-y-8 lg:pt-[52px]">
          <PriceCard price={SERVICE_CATALOG.bank_account.unitUsd} caption="One-time service fee." note="We prepare your documents and book your appointment, so it's done in one visit." busy={busy} onBuy={buy} done={done} />
          <WhyCard title="Account Benefits" items={["Pay rent", "Receive your salary", "Use local payment apps"]} bottom={SITE_LINE} />
        </div>
      </div>

      <Faq
        items={[
          ["Why do I need a Vietnamese bank account?", SITE_LINE],
          [
            "Do I need to be in Vietnam to open this account?",
            "Yes. Accounts are opened at the bank. We prepare your documents and book your appointment so it's done in one visit.",
          ],
          ["What documents do I need?", DOCUMENTS.join("; ") + "."],
          [
            "Is my personal information secure?",
            "Yes. Files are encrypted in transit and at rest, stored on GDPR-compliant infrastructure, and only ever accessed by the XploreVietnam team handling your application.",
          ],
        ]}
      />

      <NextSteps
        subtitle="After opening your bank account, most users complete these essential steps"
        cards={[
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
