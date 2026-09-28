// Vietnam journey: the step list, how its dates are calculated, and the onboarding options.
// All wording is taken from the XploreVietnam website (visas, services and navigator pages).

export const COUNTRIES = [
  "Afghanistan", "Albania", "Algeria", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahrain",
  "Bangladesh", "Belarus", "Belgium", "Bolivia", "Brazil", "Bulgaria", "Cambodia", "Canada", "Chile", "China",
  "Colombia", "Croatia", "Cyprus", "Czech Republic", "Denmark", "Ecuador", "Egypt", "Estonia", "Finland", "France",
  "Georgia", "Germany", "Ghana", "Greece", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Israel", "Italy", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kuwait", "Laos", "Latvia", "Lebanon",
  "Lithuania", "Luxembourg", "Malaysia", "Mexico", "Morocco", "Myanmar", "Netherlands", "New Zealand", "Nigeria",
  "Norway", "Pakistan", "Peru", "Philippines", "Poland", "Portugal", "Qatar", "Romania", "Russia", "Saudi Arabia",
  "Singapore", "Slovakia", "Slovenia", "South Africa", "South Korea", "Spain", "Sweden", "Switzerland", "Taiwan",
  "Thailand", "Turkey", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Venezuela", "Vietnam",
];

export const MOVE_STAGES = [
  { value: "researching", label: "Just researching, no firm plans yet" },
  { value: "planning", label: "Planning my move for the future (12+ months out)" },
  { value: "moving_soon", label: "I'm moving soon (within 12 months)" },
  { value: "moved", label: "Already in Vietnam, looking for ongoing support" },
];

export const VISA_TYPES = [
  { value: "evisa", label: "E-Visa", sub: "Best for exploring Vietnam before committing, or for stays of up to 90 days" },
  { value: "work", label: "Work Visa (LĐ)", sub: "Best if you have a job with a Vietnamese employer" },
  { value: "investor", label: "Investor Visa (ĐT)", sub: "Best for founders and investors running a business here" },
  { value: "family", label: "Family Visa (TT)", sub: "Best for spouses and children of Vietnamese citizens or of qualifying visa holders" },
  { value: "unsure", label: "Not sure yet", sub: "Remote workers and retirees: your options depend on your situation" },
];

export const SPONSOR_TYPES = [
  "My Vietnamese employer",
  "My own Vietnamese company",
  "My Vietnamese spouse or parent",
  "My family member's employer or company",
];

export type JourneyItem = {
  id: number;
  title: string;
  description: string;
  cta?: { label: string; href: string };
  date: Date | null;
  dateText?: string;
};

const addMonths = (d: Date, n: number) => {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
};
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** Move date anchors every date. Without one we assume 6 months from today (same rule StartAbroad uses). */
export function anchorDate(moveDate: string | null) {
  return moveDate ? new Date(moveDate + "T00:00:00") : addMonths(new Date(), 6);
}

export function buildJourney(visaType: string | null, moveDate: string | null): JourneyItem[] {
  const today = new Date();
  const t = anchorDate(moveDate);
  const v = visaType || "unsure";
  const residence = v !== "evisa";

  const residenceTitle: Record<string, string> = {
    work: "Apply for your Work Permit and TRC",
    investor: "Apply for your Investor Visa and TRC",
    family: "Apply for your Family Visa and TRC",
    unsure: "Apply for your Temporary Residence Card",
  };
  const residenceText: Record<string, string> = {
    work: "Once the work permit is issued, you can get an LĐ visa and a TRC valid for up to 2 years, matching your permit. The TRC means no more visa runs while you hold the job.",
    investor: "The capital must be contributed to a Vietnamese company. ĐT1 to ĐT3 investors can apply for a TRC; the ĐT4 tier gives a one-year visa but no residence card.",
    family: "The TT visa lets family members live in Vietnam based on their relationship to a Vietnamese citizen or to a foreigner holding a work, investor or similar visa. It can lead to a TRC valid for up to 3 years.",
    unsure: "A TRC linked to your work permit, investment or family tie is how you live in Vietnam long term, usually valid for 1 to 10 years depending on the category.",
  };

  const items: (JourneyItem | false)[] = [
    {
      id: 1,
      title: "Choose Your Visa Route",
      description:
        "Vietnam has no retirement visa and no digital nomad visa yet, so the right route depends on why you are here: work, business, family or an extended stay. Choosing the wrong visa can delay your move by months.",
      cta: { label: "View Visa Checklist →", href: "/vietnam/visa" },
      date: today,
    },
    residence && {
      id: 2,
      title: "Start Collecting Visa Documents",
      description:
        "Proof of qualifications or experience, such as a degree and work references, legalised and translated. Collecting and legalising documents abroad usually takes 2–6 weeks.",
      cta: { label: "Get my visa packet reviewed for $595 →", href: "/vietnam/visa#review" },
      date: addMonths(t, -4),
    },
    residence &&
      (v === "family"
        ? {
            id: 3,
            title: "Legalise Your Relationship Documents",
            description:
              "Proof of the relationship, such as a marriage or birth certificate, legalised and translated.",
            date: addDays(addMonths(t, -2), -21),
          }
        : {
            id: 3,
            title: "Get a Legalised Criminal Record Check",
            description: "A criminal record check, usually from your home country and legalised for use in Vietnam.",
            date: addDays(addMonths(t, -2), -21),
          }),
    {
      id: 4,
      title: "Secure Your Housing",
      description:
        "Your address in Vietnam must be registered for temporary residence. You'll need proof of this registration for a residence card.",
      cta: { label: "Find Rental Properties →", href: "/vietnam/rental-search" },
      date: addMonths(t, -1),
    },
    {
      id: 5,
      title: v === "evisa" ? "Apply for Your E-Visa" : "Apply for Your Entry Visa",
      description:
        "Citizens of every country can apply online for an e-visa valid for up to 90 days, with single or multiple entry. The government fee is USD 25 for single entry and USD 50 for multiple entry. Check your own nationality before you travel: some countries can enter visa-free for up to 45 days.",
      date: addDays(t, -21),
    },
    {
      id: 6,
      title: "Move to Vietnam",
      description: "Arrive in Vietnam within the dates on your visa.",
      date: t,
    },
    {
      id: 7,
      title: "Register Your Temporary Residence",
      description:
        "Your landlord or hotel declares your stay with the local police. Keep proof of the registration: you'll need it for your bank, tax code and residence card.",
      date: null,
      dateText: "on arrival",
    },
    {
      id: 8,
      title: "Open a Vietnamese Bank Account",
      description:
        "A Vietnamese bank account is how you'll pay rent, receive your salary and use local payment apps. We prepare your documents and book your appointment with a bank that works well with foreigners, so it's done in one visit.",
      cta: { label: "Open my bank account for $325 →", href: "/vietnam/bank-account" },
      date: addDays(t, 14),
    },
    {
      id: 9,
      title: "Get Your Tax Code (MST)",
      description:
        "Your personal tax code (MST) is needed to file taxes in Vietnam, and for many banking and employment steps. We handle the registration with the tax office, start to finish, so it's ready when you need it.",
      cta: { label: "Handle my tax code for $150 →", href: "/vietnam/tax-code" },
      date: addDays(t, 21),
    },
    residence && {
      id: 10,
      title: residenceTitle[v] + "*",
      description: residenceText[v],
      date: addMonths(t, 1),
    },
    residence && {
      id: 11,
      title: "Expected Temporary Residence Card",
      description: "Usually a few weeks once your work permit, investment certificate or family documents are ready.",
      date: null,
      dateText: "usually a few weeks after applying",
    },
    residence && {
      id: 12,
      title: "Plan Your TRC Renewal",
      description: "Renewals should be planned before they are due, so there is never a gap in your right to stay.",
      date: null,
      dateText: "before your TRC expires",
    },
    !residence && {
      id: 13,
      title: "Plan Your Next Step Before Your Visa Ends",
      description:
        "The e-visa does not allow working for a Vietnamese employer, applying for a Temporary Residence Card or staying beyond the dates on the visa. Overstaying, even by a few days, can lead to fines and problems with future applications.",
      cta: { label: "Talk to us about staying longer →", href: "/vietnam/consultation" },
      date: null,
      dateText: "before the end date on your visa",
    },
  ];
  return items.filter(Boolean) as JourneyItem[];
}

/** The six milestones in the header tracker. A milestone is done when all its steps are ticked. */
export function milestones(visaType: string | null) {
  const residence = visaType !== "evisa";
  return [
    { label: "Visa Docs", itemIds: residence ? [1, 2, 3] : [1] },
    { label: "Housing", itemIds: [4] },
    { label: "Entry Visa", itemIds: [5] },
    { label: "Arrival", itemIds: [6, 7] },
    { label: "Bank & Tax", itemIds: [8, 9] },
    residence ? { label: "TRC", itemIds: [10, 11] } : { label: "Next Step", itemIds: [13] },
  ];
}

export const formatDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });

export const formatLongDate = (d: Date) =>
  d.toLocaleDateString("en-US", { month: "long", day: "2-digit", year: "numeric" });
