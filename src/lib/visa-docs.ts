// Document checklists per visa route.
// Sources: XploreVietnam visas page; Decree 219/2025/ND-CP (work permits, Arts. 5, 18, 21);
// Law on Entry, Exit, Transit and Residence of Foreigners (TRC: forms NA6/NA7/NA8/NA16,
// card must expire at least 30 days before the passport). Review before launch: rules change often.

export type VisaDoc = {
  key: string;
  title: string;
  required: boolean;
  text?: string;
  bullets?: string[];
  /** false = nothing to upload, shows a note instead of the drop zone */
  upload?: boolean;
  note?: string;
  links?: { label: string; href: string }[];
};

export type Checklist = {
  title: string;
  subtitle: string;
  docs: VisaDoc[];
  /** documents each dependent (spouse / child) needs */
  dependentDocs: VisaDoc[];
};

const PASSPORT_TRC: VisaDoc = {
  key: "passport",
  title: "Valid Passport",
  required: true,
  bullets: [
    "Upload your passport's photo page.",
    "Your Temporary Residence Card must expire at least 30 days before your passport. For a 1-year card you need at least 13 months of passport validity left.",
    "Keep the original: it is handed in with your TRC application.",
  ],
};

const PHOTOS_TRC: VisaDoc = {
  key: "photos",
  title: "Passport Photos",
  required: true,
  text: "Two recent photos, 2 cm x 3 cm, for your TRC application (one is attached to Form NA8).",
};

const RESIDENCE_REG: VisaDoc = {
  key: "residence_registration",
  title: "Temporary Residence Registration",
  required: true,
  text: "Confirmation that your address in Vietnam is registered with the local police. Your landlord or hotel declares your stay; ask them for the confirmation.",
  links: [{ label: "Rental Search Assistance", href: "/vietnam/rental-search" }],
};

const NA8: VisaDoc = {
  key: "form_na8",
  title: "TRC Declaration (Form NA8)",
  required: true,
  text: "The declaration requesting your Temporary Residence Card, signed, with one 2 x 3 cm photo attached.",
};

const CURRENT_VISA = (code: string): VisaDoc => ({
  key: "current_visa",
  title: `Current Visa (${code}) or Entry Stamp`,
  required: true,
  text: `Your current visa page or entry stamp. A TRC is issued on a ${code} visa; a tourist e-visa can't always be changed from inside Vietnam, so check before you travel.`,
});

const RELATIONSHIP: VisaDoc = {
  key: "relationship_certificate",
  title: "Marriage or Birth Certificate",
  required: true,
  text: "Proof of the relationship: a marriage certificate for a spouse, a birth certificate for a child. If it was issued abroad, it must be consularly legalised and translated into Vietnamese with a certified translation.",
};

const DEPENDENT_DOCS: VisaDoc[] = [
  { ...PASSPORT_TRC, bullets: PASSPORT_TRC.bullets!.slice(0, 2) },
  PHOTOS_TRC,
  RELATIONSHIP,
  RESIDENCE_REG,
  NA8,
];

export const CHECKLISTS: Record<string, Checklist> = {
  work: {
    title: "Work Visa & TRC Checklist",
    subtitle: "Everything you need for your Vietnamese work permit, LĐ visa and Temporary Residence Card — checklists, documents, and timelines.",
    docs: [
      {
        key: "passport",
        title: "Valid Passport",
        required: true,
        bullets: [
          "Upload your passport's photo page.",
          "Your Temporary Residence Card must expire at least 30 days before your passport. A work TRC can run up to 2 years, so aim for at least 25 months of passport validity.",
        ],
      },
      {
        key: "photos",
        title: "Passport Photos",
        required: true,
        bullets: [
          "Work permit: two colour photos, 4 cm x 6 cm, white background, frontal view, bareheaded, no glasses.",
          "TRC: two photos, 2 cm x 3 cm.",
        ],
      },
      {
        key: "criminal_record",
        title: "Criminal Record Certificate",
        required: true,
        text: "Issued by your home country (or by Vietnam if you already live here) no more than 6 months before your work permit application is filed. A foreign certificate must be consularly legalised and translated into Vietnamese with a certified translation.",
      },
      {
        key: "health_certificate",
        title: "Health Certificate",
        required: true,
        text: "Issued no more than 12 months before your work permit application is filed. A foreign health certificate is only accepted from a country that has a mutual recognition agreement with Vietnam; otherwise get it from a licensed hospital in Vietnam.",
      },
      {
        key: "qualifications",
        title: "Degree or Qualifications",
        required: true,
        text: "Your diploma or professional certificates proving you qualify for the role. Documents issued abroad must be consularly legalised and translated into Vietnamese with a certified translation.",
      },
      {
        key: "experience",
        title: "Proof of Work Experience",
        required: false,
        text: "Letters from previous employers confirming your role and years of experience. Needed for experts, managers and technical workers; legalised and translated like your degree.",
      },
      {
        key: "employment_contract",
        title: "Employment Contract or Job Offer",
        required: true,
        text: "A document proving the form of employment, usually your labour contract with the Vietnamese employer.",
      },
      {
        key: "employer_form_03",
        title: "Employer Request (Form No. 03)",
        required: false,
        text: "Your employer's written request explaining the need to employ a foreign worker and applying for your work permit. Your employer prepares and files it; upload a copy if you have one.",
      },
      {
        key: "work_permit",
        title: "Work Permit",
        required: true,
        text: "Once issued, upload a copy of your work permit (or your work permit exemption). To apply for a TRC it needs at least 12 months of validity.",
      },
      CURRENT_VISA("LĐ"),
      RESIDENCE_REG,
      NA8,
      {
        key: "form_na6",
        title: "Employer Sponsor Letter (Form NA6)",
        required: true,
        text: "Your employer's letter requesting your TRC, with the company's business registration certificate and its seal and signature registration (Form NA16).",
      },
    ],
    dependentDocs: DEPENDENT_DOCS,
  },

  investor: {
    title: "Investor Visa & TRC Checklist",
    subtitle: "Everything you need for your Vietnamese investor (ĐT) visa and Temporary Residence Card — checklists, documents, and timelines.",
    docs: [
      { ...PASSPORT_TRC, bullets: [PASSPORT_TRC.bullets![0], "Your Temporary Residence Card must expire at least 30 days before your passport. Investor TRCs run from 3 to 10 years depending on your tier, so check your validity against the card you're applying for.", PASSPORT_TRC.bullets![2]] },
      PHOTOS_TRC,
      {
        key: "enterprise_registration",
        title: "Enterprise Registration Certificate",
        required: true,
        text: "The registration certificate of the Vietnamese company you invested in.",
      },
      {
        key: "investment_registration",
        title: "Investment Registration Certificate",
        required: false,
        text: "If your investment required one, the investment registration certificate for the project.",
      },
      {
        key: "capital_contribution",
        title: "Proof of Capital Contribution",
        required: true,
        bullets: [
          "Documents showing the capital you contributed to the company, such as the bank confirmation of the transfer into the company's capital account.",
          "The capital must be contributed to a Vietnamese company. Money sitting in a bank account does not count.",
          "ĐT1–ĐT3 (VND 3 billion or more) can apply for a TRC. ĐT4 (under VND 3 billion) gives a visa of up to 12 months but no TRC.",
        ],
      },
      {
        key: "form_na16",
        title: "Company Seal & Signature Registration (Form NA16)",
        required: true,
        text: "Registers your company's seal and its legal representative's signature with the immigration office. Filed once per company.",
      },
      CURRENT_VISA("ĐT"),
      RESIDENCE_REG,
      NA8,
      {
        key: "form_na6",
        title: "Company Sponsor Letter (Form NA6)",
        required: true,
        text: "Your company's letter requesting your TRC, signed by its legal representative and sealed.",
      },
    ],
    dependentDocs: DEPENDENT_DOCS,
  },

  family: {
    title: "Family Visa & TRC Checklist",
    subtitle: "Everything you need for your Vietnamese family (TT) visa and Temporary Residence Card — checklists, documents, and timelines.",
    docs: [
      { ...PASSPORT_TRC, bullets: [PASSPORT_TRC.bullets![0], "Your Temporary Residence Card must expire at least 30 days before your passport. A family TRC can run up to 3 years, so check your validity against the card you're applying for.", PASSPORT_TRC.bullets![2]] },
      PHOTOS_TRC,
      RELATIONSHIP,
      {
        key: "sponsor_id",
        title: "Sponsor's Identification",
        required: true,
        text: "Your sponsor's ID: the ID card of your Vietnamese spouse or parent, or, if your family member is a foreigner, their passport, visa or TRC, and work permit or investment documents.",
      },
      {
        key: "sponsor_letter",
        title: "Sponsor Letter (Form NA7 or NA6)",
        required: true,
        text: "The letter requesting your TRC: Form NA7 when a Vietnamese family member sponsors you, or Form NA6 from your family member's employer or company.",
      },
      CURRENT_VISA("TT"),
      RESIDENCE_REG,
      NA8,
    ],
    dependentDocs: DEPENDENT_DOCS,
  },

  evisa: {
    title: "E-Visa Checklist",
    subtitle: "Everything you need to apply for Vietnam's e-visa — up to 90 days, single or multiple entry, open to all nationalities.",
    docs: [
      {
        key: "passport",
        title: "Valid Passport",
        required: true,
        bullets: [
          "Upload a clear scan of your passport's photo page. The two machine-readable lines at the bottom must be readable.",
          "Check your passport's validity covers your whole stay before you apply.",
        ],
      },
      {
        key: "portrait",
        title: "Portrait Photo",
        required: true,
        text: "A recent portrait photo, 4 cm x 6 cm, white background, looking straight at the camera, no glasses.",
      },
      {
        key: "travel_details",
        title: "Travel Details",
        required: true,
        upload: false,
        text: "Your intended entry and exit dates, your port of entry (airport or border gate), and your address in Vietnam.",
        note: "Nothing to upload. You'll enter these details on the official e-visa form.",
      },
      {
        key: "fee",
        title: "Government Fee",
        required: true,
        upload: false,
        text: "USD 25 for single entry or USD 50 for multiple entry, paid online by card when you submit.",
        note: "Nothing to upload. Processing usually takes a few working days when the application is complete.",
        links: [{ label: "Official e-visa website", href: "https://evisa.gov.vn" }],
      },
    ],
    dependentDocs: [
      {
        key: "passport",
        title: "Valid Passport",
        required: true,
        text: "A clear scan of the passport's photo page, machine-readable lines readable. Every traveller, including children, needs their own e-visa.",
      },
      {
        key: "portrait",
        title: "Portrait Photo",
        required: true,
        text: "A recent portrait photo, 4 cm x 6 cm, white background, looking straight at the camera, no glasses.",
      },
    ],
  },
};

export const MAX_FILE_BYTES = 4 * 1024 * 1024;
export const MAX_FILES_PER_DOC = 5;
export const ACCEPTED = ["application/pdf", "image/png", "image/jpeg"];
export const ACCEPT_ATTR = ".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg";

export const CITIES = ["Ho Chi Minh City", "Hanoi", "Da Nang", "Hoi An", "Other"];

export const REVIEW = { price: 595, perDependent: 125, fullServiceFrom: 975 };
