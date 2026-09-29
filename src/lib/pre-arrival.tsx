import Link from "next/link";
import { siteLink } from "./utils";

// Pre-arrival checklist for Vietnam. Keys are stored per client, so never rename a key once live.
// Service mentions match the website's package comparison (airport pickup, utilities set-up and
// temporary residence registration are Concierge inclusions).
const A = ({ href, children }: { href: string; children: React.ReactNode }) =>
  href.startsWith("/") ? (
    <Link href={href} className="text-primary underline">
      {children}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener" className="text-primary underline">
      {children}
    </a>
  );

export const GROUPS: { title: string; items: [string, React.ReactNode][] }[] = [
  {
    title: "1-2 months before arrival",
    items: [
      ["flight", "Book your flight to Vietnam (if you haven't already)."],
      ["passport-validity", "Check your passport's validity covers your visa and, if you'll apply for one, your Temporary Residence Card."],
      ["visa-docs", <>Collect and legalise the documents your visa needs. See your <A href="/vietnam/visa">visa checklist</A>.</>],
      ["bring-vs-leave", "Decide what to bring vs. leave, and what to bring on the plane vs. ship."],
      ["shipping", <>Start the shipping process as early as possible if shipping belongings. Read our <A href={siteLink("shipping.html")}>shipping guide</A>.</>],
      ["pets", <>If you&apos;re bringing a pet, start its paperwork early. Read our <A href={siteLink("pets.html")}>pet relocation guide</A>.</>],
      ["tax-specialist", "Connect with an expat tax specialist."],
      ["investments", "Understand the implications of moving to Vietnam for your investments."],
      ["cards", "Apply for credit/debit cards that minimize foreign transaction and ATM fees."],
      ["transfers", <>Create an account with <A href="https://wise.com">Wise</A> or a similar service for international transfers.</>],
      ["health-insurance", <>Arrange private health insurance that covers you from the day you land. Read our <A href={siteLink("healthcare.html")}>healthcare guide</A>.</>],
      ["keep-number", "Decide if you will keep your current phone number."],
      ["unlocked", "Confirm that your phone is unlocked."],
    ],
  },
  {
    title: "2-3 weeks before arrival",
    items: [
      ["evisa", <>If you&apos;re entering on an e-visa, apply on the <A href="https://evisa.gov.vn">official e-visa website</A>. Processing usually takes a few working days.</>],
      ["baggage", "Purchase extra baggage if bringing extra bags or containers on the plane."],
      ["airport-transfer", "Book your airport transfer (airport pickup is included for Concierge clients)."],
      ["medications", "Secure extra weeks' or months' supply of any medications, and bring the prescriptions."],
      ["mailbox", "Sign up for a virtual mailbox if needed."],
      ["utilities", "Ensure the utilities in your Vietnam home will be connected upon arrival (utilities set-up is included for Concierge clients)."],
      ["apps", "Download Zalo, Grab and WhatsApp onto your phone. Zalo is the messaging app most Vietnamese landlords and businesses use."],
    ],
  },
  {
    title: "1-week before arrival",
    items: [
      ["finalize-number", "Finalize your plan to keep your current phone number if desired."],
      ["2fa", "Ensure you can receive two-factor authentication messages to your phone."],
      ["2fa-update", "Update your two factor authentication number with banks, insurance companies, etc. if required."],
      ["mailing-address", "Update your mailing address with your bank(s), home government, etc. if needed."],
      ["pay-utilities", "Understand how to pay for utilities."],
      ["vpn", "Get a VPN if you'll need services from home that are restricted by location."],
      ["passport-copies", "Print copies of your passport and visa to have on hand at all times."],
      ["doc-copies", "Ensure you have digital or physical copies of all visa application documents."],
      ["travel-notice", "Add travel notifications for all relevant credit and debit cards."],
    ],
  },
  {
    title: "Arrival",
    items: [
      ["arrive", "Arrive in Vietnam!"],
      ["residence-registration", "Make sure your landlord or hotel declares your temporary residence to the police, usually within 12 hours of arrival (included for Concierge clients)."],
      ["sim", "Get a local SIM card. Bring your passport: SIM cards are registered to your ID."],
      ["grab", "Set up Grab with a payment card for rides and food delivery."],
      ["bank", <>Open a Vietnamese bank account. <A href="/vietnam/bank-account">We can help</A>.</>],
      ["tax-code", <>Get your tax code (MST) if you&apos;ll work in Vietnam. <A href="/vietnam/tax-code">We can help</A>.</>],
      ["market", "Identify your local wet market and supermarket."],
      ["trc", <>Start your work permit or Temporary Residence Card application if it applies to you. See your <A href="/vietnam/visa">visa checklist</A>.</>],
    ],
  },
];

export const TOTAL = GROUPS.reduce((n, g) => n + g.items.length, 0);

