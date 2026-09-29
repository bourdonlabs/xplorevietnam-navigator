// Partner directory. Only partners XploreVietnam has confirmed are listed; add more here and they
// appear on the page with their category chip automatically.
// action "visit" = button to the partner's site; "intro" = "Request Introduction" email to the team.

export type Partner = {
  name: string;
  category: string;
  tag?: string;
  text: string;
  action: "visit" | "intro";
  url?: string;
  cta?: string;
};

export type Category = { key: string; title: string; subtitle: string; icon: string };

export const CATEGORIES: Category[] = [
  { key: "insurance", title: "Health Insurance", subtitle: "Coverage options for every stage of your move", icon: "activity" },
  { key: "tax", title: "Accounting & Tax", subtitle: "Vietnamese and cross-border tax obligations with expert guidance", icon: "file" },
  { key: "money", title: "International Money Transfer", subtitle: "Move funds across borders with competitive rates and minimal fees", icon: "dollar" },
  { key: "legalisation", title: "Legalisation & Translation", subtitle: "Consular legalisation and certified translations for your official documents", icon: "globe" },
  { key: "vietnamese", title: "Vietnamese Lessons", subtitle: "Start learning the language before and after your move", icon: "chat" },
  { key: "pets", title: "Pet Relocation", subtitle: "Trusted partners to help your pets travel safely to Vietnam", icon: "paw" },
  { key: "moving", title: "Moving & Shipping", subtitle: "Get your belongings to Vietnam", icon: "truck" },
];

export const PARTNERS: Partner[] = [];

// Featured lesson for the Vietnamese Lessons section.
export const LESSON = {
  youtubeId: "OiAnEfVbEAk",
  label: "Free introductory lesson",
  title: "Vietnamese Tones — A Full Simple Guide",
  text: "The Vietnamese tones explained simply, with exercises to practise each one. Tones change the meaning of a word, so they are the first thing every newcomer to Vietnam should learn.",
  meta: ["Video lesson", "All levels", "Vietnamese"],
  partner: {
    name: "Levion",
    text: "Real Vietnamese for real life: 300+ on-demand lessons plus small live group classes on Zoom (3–5 learners) with native teachers from Hanoi and Saigon. Free level test and 60-minute trial class.",
    url: "https://levion.vn",
    cta: "Start Learning with Levion",
  },
};
