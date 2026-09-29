// Vietnam cost of living model, all figures USD per month unless noted.
// Anchored on the website's Cost of Living page (rents, utilities, Grab, motorbike rental, groceries,
// eating out, insurance, doctor visits, school fees, sample budgets). Everything marked "estimate"
// is a planning assumption XploreVietnam can tune here without touching the page.

export const VND_PER_USD = 26300; // approx. rate shown next to the total; update from time to time

export type Opt = { value: string; label: string };

// Mid-range 1-bedroom apartment rent by area (the model's base), and a factor for everyday prices.
export const LOCATIONS: (Opt & { rent: number; daily: number })[] = [
  { value: "hcm-d1", label: "Ho Chi Minh City — District 1 / Thu Thiem", rent: 1000, daily: 1.1 },
  { value: "hcm-thaodien", label: "Ho Chi Minh City — Thao Dien", rent: 900, daily: 1.1 },
  { value: "hcm-binhthanh", label: "Ho Chi Minh City — Binh Thanh / District 3 / Phu Nhuan", rent: 700, daily: 1.0 },
  { value: "hcm-d7", label: "Ho Chi Minh City — District 7 (Phu My Hung)", rent: 750, daily: 1.0 },
  { value: "hn-tayho", label: "Hanoi — Tay Ho (West Lake)", rent: 850, daily: 1.05 },
  { value: "hn-central", label: "Hanoi — Ba Dinh / Hoan Kiem", rent: 800, daily: 1.0 },
  { value: "hn-caugiay", label: "Hanoi — Cau Giay / other districts", rent: 650, daily: 0.95 },
  { value: "dn-beach", label: "Da Nang — beach (An Thuong / My Khe)", rent: 480, daily: 0.9 },
  { value: "dn-city", label: "Da Nang — city centre", rent: 400, daily: 0.88 },
  { value: "hoian", label: "Hoi An", rent: 420, daily: 0.88 },
  { value: "nhatrang", label: "Nha Trang", rent: 420, daily: 0.88 },
  { value: "dalat", label: "Da Lat", rent: 330, daily: 0.85 },
];

export const ACCOMMODATION: (Opt & { rent: number; mgmt: boolean; note?: string })[] = [
  { value: "apartment", label: "Apartment", rent: 1.0, mgmt: true },
  { value: "serviced", label: "Fully serviced condo", rent: 1.35, mgmt: false, note: "Cleaning and building fees are usually included" },
  { value: "townhouse", label: "Townhouse", rent: 0.95, mgmt: false },
  { value: "villa", label: "Villa", rent: 1.7, mgmt: false },
  { value: "local", label: "Local house (in an alley)", rent: 0.6, mgmt: false },
];

export const BEDROOMS: (Opt & { rent: number; m2: number; power: number })[] = [
  { value: "studio", label: "Studio", rent: 0.75, m2: 35, power: 40 },
  { value: "1", label: "1 bedroom", rent: 1.0, m2: 55, power: 50 },
  { value: "2", label: "2 bedrooms", rent: 1.5, m2: 80, power: 75 },
  { value: "3", label: "3 bedrooms", rent: 2.0, m2: 110, power: 100 },
  { value: "4", label: "4+ bedrooms", rent: 2.6, m2: 150, power: 130 },
];

// Rent factor, and building management fee per m² (estimate: ~VND 10,000–26,000/m²).
export const QUALITY: (Opt & { rent: number; mgmtPerM2: number })[] = [
  { value: "high", label: "High-end", rent: 1.6, mgmtPerM2: 1.0 },
  { value: "mid", label: "Mid-range", rent: 1.0, mgmtPerM2: 0.6 },
  { value: "budget", label: "Budget", rent: 0.6, mgmtPerM2: 0.4 },
];

// Electricity multiplier. Site: $40–60 a month in cooler months, $60–100+ in the hot season with regular AC.
export const AIRCON: (Opt & { f: number })[] = [
  { value: "light", label: "Light (evenings only)", f: 0.7 },
  { value: "moderate", label: "Moderate", f: 1.0 },
  { value: "heavy", label: "Heavy (most of the day)", f: 1.5 },
];

export const ELECTRIC_BILLING: (Opt & { f: number })[] = [
  { value: "evn", label: "Official EVN tariff", f: 1.0 },
  { value: "flat", label: "Landlord flat rate (VND 3,500–4,000/kWh)", f: 1.25 },
];

// Per adult; children count at 60%. Site: $120–220 per person local, more with imported products.
export const GROCERIES: (Opt & { perPerson: number })[] = [
  { value: "local", label: "Local markets and supermarkets", perPerson: 130 },
  { value: "mixed", label: "Mix of local and imported", perPerson: 200 },
  { value: "imported", label: "Mostly imported / Western brands", perPerson: 350 },
];

// Site: mobile plans with data around $2–$8 a month. Fiber internet $7–$12 is added per household.
export const PHONE: (Opt & { perPerson: number })[] = [
  { value: "basic", label: "Basic data plan", perPerson: 3 },
  { value: "standard", label: "Standard data plan", perPerson: 6 },
  { value: "unlimited", label: "Large / unlimited data plan", perPerson: 10 },
];
export const FIBER_INTERNET = 10;

// Price per person per meal. Site: street food $1.50–$2.50, mid-range main course $7–$12.
export const RESTAURANT: (Opt & { perMeal: number })[] = [
  { value: "street", label: "Street food (phở, cơm tấm)", perMeal: 2 },
  { value: "local", label: "Local restaurants", perMeal: 5 },
  { value: "mid", label: "Mid-range restaurants", perMeal: 10 },
  { value: "western", label: "Upscale and Western restaurants", perMeal: 25 },
];

// Site: VND 15,000–25,000 at a street stall, VND 50,000–80,000 in a specialty café.
export const COFFEE: (Opt & { perCup: number })[] = [
  { value: "street", label: "Street stalls (cà phê sữa đá)", perCup: 0.8 },
  { value: "cafe", label: "Specialty cafés", perCup: 2.6 },
];

export const HELPER_RATE = 4; // estimate: VND 80,000–120,000 an hour for a cleaner / home help

export const DENTAL: (Opt & { monthly: number })[] = [
  { value: "none", label: "None", monthly: 0 },
  { value: "checkups", label: "Check-ups and cleaning only", monthly: 6 },
  { value: "regular", label: "Regular treatment", monthly: 20 },
  { value: "major", label: "Major work (crowns, implants)", monthly: 60 },
];

export const PHARMACY: (Opt & { perPerson: number })[] = [
  { value: "low", label: "Low", perPerson: 4 },
  { value: "moderate", label: "Moderate", perPerson: 12 },
  { value: "high", label: "High (regular prescriptions)", perPerson: 35 },
];

export const DOCTOR_VISIT = 90; // site: $60–$120 at an international hospital

// Site: Grab motorbike $0.60–$1.40 a short ride, Grab car $3.50–$5.50; sample budgets $100–$120 a month for two.
export const GRAB: (Opt & { monthly: number })[] = [
  { value: "none", label: "None", monthly: 0 },
  { value: "light", label: "Light (a few rides a week)", monthly: 40 },
  { value: "moderate", label: "Moderate (most days)", monthly: 100 },
  { value: "heavy", label: "Heavy (Grab car daily)", monthly: 220 },
];

export const MOTORBIKE_MODE: (Opt & { monthly: number })[] = [
  { value: "rent", label: "Rented long-term", monthly: 70 }, // site: $60–$80 a month
  { value: "own", label: "Owned (maintenance and parking)", monthly: 25 }, // estimate
];
export const MOTORBIKE_FUEL = 15; // per bike, from the Da Nang sample budget

// Estimates: car lease or ownership, insurance, parking and fuel. Cars carry high import taxes in Vietnam.
export const CAR_STANDARD: (Opt & { monthly: number })[] = [
  { value: "economy", label: "Economy", monthly: 550 },
  { value: "mid", label: "Mid-range", monthly: 850 },
  { value: "premium", label: "Premium", monthly: 1400 },
];
export const CAR_USAGE: (Opt & { fuel: number })[] = [
  { value: "light", label: "Light", fuel: 40 },
  { value: "moderate", label: "Moderate", fuel: 80 },
  { value: "heavy", label: "Heavy", fuel: 150 },
];
export const DRIVER_MONTHLY = 450; // estimate for a full-time private driver

// Site: HCMC Metro Line 1 VND 6,000–20,000 a trip, or VND 300,000 ($12) for a monthly pass.
export const PUBLIC_TRANSPORT: (Opt & { perPerson: number })[] = [
  { value: "none", label: "None", perPerson: 0 },
  { value: "occasional", label: "Occasional bus or metro", perPerson: 5 },
  { value: "pass", label: "Monthly metro pass", perPerson: 12 },
];

// Per adult, averaged per month. E-visa: USD 50 multiple entry every 90 days plus a trip out of the country.
// TRC: government fee from USD 145 for up to 2 years.
export const VISA: (Opt & { perAdult: number })[] = [
  { value: "evisa", label: "E-visa, leaving Vietnam every 90 days", perAdult: 0 }, // computed from the visa-run cost
  { value: "trc", label: "Temporary Residence Card", perAdult: 6 },
  { value: "employer", label: "Paid by my employer", perAdult: 0 },
  { value: "exempt", label: "Visa-exempt stays only", perAdult: 0 },
];
export const EVISA_FEE = 50;

export const PET_MONTHLY = 40; // estimate: food, vet and grooming per pet

export const range = (n: number, from = 0): Opt[] =>
  Array.from({ length: n - from + 1 }, (_, i) => ({ value: String(i + from), label: String(i + from) }));
