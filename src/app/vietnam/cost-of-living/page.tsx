"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Bike, Calculator, GraduationCap, Heart, Home, Plus, Save, Stamp, Ticket, Users, UtensilsCrossed, Zap,
  type LucideIcon,
} from "lucide-react";
import { backend } from "@/lib/backend";
import * as D from "@/lib/cost-data";
import { cn } from "@/lib/utils";
import { usePortal } from "@/components/portal-context";

type Inputs = Record<string, string>;
const DEFAULTS: Inputs = {
  children: "0", helperHours: "0", eatOut: "0", coffees: "0", motorbikes: "0", cars: "0", driver: "no", pets: "0",
  doctorVisits: "0", visaRun: "120",
};

const num = (v?: string) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
const find = <T extends D.Opt>(list: T[], v?: string) => list.find((o) => o.value === v);
const WEEKS = 4.33;
const usd = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

function calculate(i: Inputs) {
  const adults = num(i.adults);
  const kids = num(i.children);
  const people = adults + kids;
  const eaters = adults + 0.6 * kids;
  const loc = find(D.LOCATIONS, i.location);
  const acc = find(D.ACCOMMODATION, i.accommodation);
  const bed = find(D.BEDROOMS, i.bedrooms);
  const q = find(D.QUALITY, i.quality);
  const daily = loc?.daily ?? 1;

  const rent = loc && acc && bed && q ? Math.round((loc.rent * acc.rent * bed.rent * q.rent) / 10) * 10 : 0;
  const mgmt = acc?.mgmt && bed && q ? bed.m2 * q.mgmtPerM2 : 0;
  const ac = find(D.AIRCON, i.aircon);
  const billing = find(D.ELECTRIC_BILLING, i.billing);
  const electricity = bed && ac ? bed.power * ac.f * (billing?.f ?? 1) : 0;
  const water = bed ? 5 + 2 * Math.max(1, people) : 0;
  const internet = bed ? D.FIBER_INTERNET : 0;
  const phone = (find(D.PHONE, i.phone)?.perPerson ?? 0) * adults;

  const groceries = (find(D.GROCERIES, i.groceries)?.perPerson ?? 0) * eaters * daily;
  const dining = num(i.eatOut) * WEEKS * (find(D.RESTAURANT, i.restaurant)?.perMeal ?? 0) * eaters * daily;
  const coffee = num(i.coffees) * WEEKS * (find(D.COFFEE, i.coffee)?.perCup ?? 0) * adults;
  const helper = num(i.helperHours) * WEEKS * D.HELPER_RATE;

  const dental = (find(D.DENTAL, i.dental)?.monthly ?? 0) * people;
  const pharmacy = (find(D.PHARMACY, i.pharmacy)?.perPerson ?? 0) * people;
  const insurance = num(i.insurance) * people;
  const doctor = (num(i.doctorVisits) * D.DOCTOR_VISIT) / 12;

  const grab = find(D.GRAB, i.grab)?.monthly ?? 0;
  const bikes = num(i.motorbikes) * ((find(D.MOTORBIKE_MODE, i.motorbikeMode)?.monthly ?? D.MOTORBIKE_MODE[0].monthly) + D.MOTORBIKE_FUEL);
  const cars =
    num(i.cars) * ((find(D.CAR_STANDARD, i.carStandard)?.monthly ?? 0) + (find(D.CAR_USAGE, i.carUsage)?.fuel ?? 0)) +
    (num(i.cars) > 0 && i.driver === "yes" ? D.DRIVER_MONTHLY : 0);
  const publicT = (find(D.PUBLIC_TRANSPORT, i.publicTransport)?.perPerson ?? 0) * adults;

  const visaOpt = find(D.VISA, i.visa);
  const visa = !visaOpt ? 0 : visaOpt.value === "evisa" ? ((D.EVISA_FEE + num(i.visaRun)) / 3) * people : visaOpt.perAdult * people;

  const school = kids * (num(i.schoolFees) / 12 + num(i.schoolExtras));
  const fun = num(i.hobbies) + num(i.fitness) + num(i.culture) + num(i.subscriptions) + num(i.familyDays);
  const other =
    num(i.travel) / 12 + num(i.clothes) + num(i.pets) * D.PET_MONTHLY + num(i.selfcare) + num(i.charity) +
    num(i.other1) + num(i.other2) + num(i.other3);

  const groups: [string, number][] = [
    ["Housing", rent + mgmt],
    ["Utilities, internet & phone", electricity + water + internet + phone],
    ["Groceries", groceries],
    ["Eating out & coffee", dining + coffee],
    ["Home help", helper],
    ["Health", dental + pharmacy + insurance + doctor],
    ["Transport", grab + bikes + cars + publicT],
    ["Visa & residency", visa],
    ["School", school],
    ["Entertainment", fun],
    ["Other", other],
  ];
  const total = groups.reduce((s, [, v]) => s + v, 0);
  return { groups, total, rent, mgmt, adults };
}

export default function CostOfLivingPage() {
  const { user } = usePortal();
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    backend.getCost(user.id).then((saved) => {
      if (saved) setInputs({ ...DEFAULTS, ...saved });
      setLoaded(true);
    });
  }, [user.id]);

  useEffect(() => {
    if (!loaded) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => backend.saveCost(user.id, inputs), 600);
  }, [inputs, loaded, user.id]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setInputs((cur) => ({ ...cur, [k]: e.target.value }));
  const r = useMemo(() => calculate(inputs), [inputs]);
  const acc = find(D.ACCOMMODATION, inputs.accommodation);

  const sel = (k: string, label: string, list: D.Opt[], placeholder: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <Choice value={inputs[k] ?? ""} onChange={set(k)} options={list} placeholder={placeholder} />
    </Field>
  );
  const money = (k: string, label: string, placeholder?: string, hint?: string) => (
    <Field label={label} hint={hint}>
      <Money value={inputs[k] ?? ""} onChange={set(k)} placeholder={placeholder} />
    </Field>
  );

  return (
    <div className="-m-6 bg-[#EEF4FB] p-6">
      <div className="mx-auto max-w-5xl space-y-7 py-4">
        <div className="rounded-xl bg-brand-navy px-6 py-11 text-center text-white">
          <h1 className="flex items-center justify-center gap-4 text-3xl font-bold md:text-4xl">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
              <Calculator className="h-5 w-5" />
            </span>
            Vietnam Cost of Living Calculator
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/90">
            Your guide to living costs in Vietnam. Calculate detailed monthly expenses in US dollars, with city and
            neighbourhood pricing and your own lifestyle choices.
          </p>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_330px]">
          <div className="rounded-xl bg-white shadow-sm">
            <div className="border-b p-6">
              <h2 className="text-lg font-semibold text-brand-navy">Enter Your Details</h2>
              <p className="mt-1 text-sm text-gray-700">
                Make your selections below to customize your budget calculation. Changes will automatically update your
                monthly budget on the right.
              </p>
            </div>
            <div className="divide-y px-6">
              <Section icon={Home} title="Location & Housing">
                {sel("location", "Location in Vietnam", D.LOCATIONS, "Select location...")}
                {sel("accommodation", "Type of Accommodation", D.ACCOMMODATION, "Select type...", acc?.note)}
                {sel("bedrooms", "Number of Bedrooms", D.BEDROOMS, "Select bedrooms...")}
                {sel("quality", "Quality of Home", D.QUALITY, "Select quality...")}
              </Section>

              <Section icon={Zap} title="Utilities">
                {sel("aircon", "Air-conditioning use", D.AIRCON, "Select usage...", "Electricity is the one utility that adds up in the hot season")}
                {sel("billing", "How electricity is billed", D.ELECTRIC_BILLING, "Select billing...", "Many landlords charge a flat rate above the EVN tariff — check your lease")}
              </Section>

              <Section icon={Users} title="Family">
                {sel("adults", "Adult family members", D.range(6, 1), "Select adults...")}
                {sel("children", "Children family members", D.range(6), "")}
              </Section>

              <Section icon={UtensilsCrossed} title="Lifestyle & Services">
                {sel("groceries", "Grocery shopping level", D.GROCERIES, "Select level...")}
                {sel("helperHours", "Cleaner / home help (hours a week)", ["0", "2", "4", "6", "8", "10", "15", "20", "30", "40"].map((v) => ({ value: v, label: v })), "")}
                {sel("phone", "Mobile data plan (per adult)", D.PHONE, "Select plan...", "Fiber home internet is added automatically")}
                {sel("eatOut", "Times you eat out per week", D.range(14), "")}
                {sel("restaurant", "Average restaurant standard", D.RESTAURANT, "Select standard...")}
                <div className="hidden sm:block" />
                {sel("coffees", "Coffees per week (per adult)", D.range(21), "")}
                {sel("coffee", "Where you buy coffee", D.COFFEE, "Select style...")}
              </Section>

              <Section icon={Heart} title="Health">
                {sel("dental", "Dentistry", D.DENTAL, "Select level...")}
                {sel("pharmacy", "Pharmacy", D.PHARMACY, "Select level...")}
                {money("insurance", "Private health insurance (per person, monthly)", "", "A good regional plan often costs $50–$120 per person a month")}
                {sel("doctorVisits", "International hospital visits per year", D.range(12), "", "Around $60–$120 per visit")}
              </Section>

              <Section icon={Bike} title="Transport">
                {sel("grab", "Grab / ride-hailing usage", D.GRAB, "Select usage...")}
                {sel("publicTransport", "Public transport usage", D.PUBLIC_TRANSPORT, "Select usage...")}
                {sel("motorbikes", "Number of motorbikes", D.range(4), "")}
                {sel("motorbikeMode", "Motorbikes are", D.MOTORBIKE_MODE, "Select...")}
                {sel("cars", "Number of cars", D.range(3), "", "Most expats don't need a car in the big cities")}
                {sel("carStandard", "Car standard", D.CAR_STANDARD, "Select standard...")}
                {sel("carUsage", "Car usage", D.CAR_USAGE, "Select usage...")}
                {sel("driver", "Private driver", [{ value: "no", label: "No" }, { value: "yes", label: "Yes, full time" }], "")}
              </Section>

              <Section icon={Stamp} title="Visa & Residency">
                {sel("visa", "How you'll stay in Vietnam", D.VISA, "Select...", "Counted for every family member")}
                {inputs.visa === "evisa" ? (
                  money("visaRun", "Cost of each trip out of Vietnam", "120", "Flights and a night away every 90 days, plus the USD 50 e-visa fee")
                ) : (
                  <div className="hidden sm:block" />
                )}
                <p className="text-sm text-brand-ink2 sm:col-span-2">
                  Tired of visa runs?{" "}
                  <Link href="/vietnam/visa" className="text-primary underline">
                    See which long-stay visa fits you
                  </Link>
                </p>
              </Section>

              <Section icon={GraduationCap} title="School" single>
                {money("schoolFees", "School fees (annual per child)", "", "International schools: around $11,000–$38,000 a year")}
                {money("schoolExtras", "Monthly extras (per child)", "", "Uniforms, lunches, transport, activities")}
              </Section>

              <Section icon={Ticket} title="Entertainment" single>
                {money("hobbies", "Hobbies")}
                {money("fitness", "Fitness / Sport / Gym")}
                {money("culture", "Cinema, Theatre, Live Music")}
                {money("subscriptions", "Digital TV, Music Subscriptions")}
                {money("familyDays", "Family Days Out")}
              </Section>

              <Section icon={Plus} title="Additional Monthly Expenses" single>
                {money("travel", "Annual travel budget", "", "Weekend trips and flights; divided by 12")}
                {money("clothes", "Clothes and shoes (monthly)")}
                {sel("pets", "Number of pets", D.range(5), "")}
                {money("selfcare", "Self-care / Massage / Spa / Hair")}
                {money("charity", "Charity and Giving")}
                {money("other1", "Your Other Expenses 1")}
                {money("other2", "Your Other Expenses 2")}
                {money("other3", "Your Other Expenses 3")}
              </Section>

              <div className="flex items-center gap-4 py-6">
                <button
                  type="button"
                  onClick={() => setInputs(DEFAULTS)}
                  className="h-9 rounded-md bg-gray-200 px-4 text-sm text-brand-navy hover:bg-gray-300"
                >
                  Reset All
                </button>
                <span className="flex items-center gap-1.5 text-xs text-gray-600">
                  <Save className="h-3.5 w-3.5 text-primary" /> Your data is automatically saved
                </span>
              </div>
            </div>
          </div>

          <Budget r={r} />
        </div>

        <div className="rounded-xl bg-white p-6 text-center text-sm leading-relaxed text-gray-700 shadow-sm">
          This calculator provides estimates based on typical prices in Vietnam&apos;s main expat areas. Actual expenses vary with
          lifestyle choices, exchange rates, market changes and individual circumstances. Use these figures as a starting point
          for your financial planning.
        </div>
      </div>
    </div>
  );
}

function Budget({ r }: { r: ReturnType<typeof calculate> }) {
  const rows = r.groups.filter(([, v]) => v > 0);
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm lg:sticky lg:top-6">
      <div className="flex items-center justify-between bg-brand-navy px-6 py-8">
        <h3 className="text-lg font-bold text-white">Monthly Budget</h3>
        <span className="rounded-full bg-white/20 px-4 py-2 text-sm font-bold text-white">{usd(r.total)}</span>
      </div>
      <div className="p-6">
        {rows.length === 0 ? (
          <p className="text-sm text-gray-500">Make your selections to see your monthly budget.</p>
        ) : (
          <>
            <ul className="space-y-2.5">
              {rows.map(([k, v]) => (
                <li key={k} className="flex justify-between gap-3 text-sm">
                  <span className="text-brand-ink2">{k}</span>
                  <span className="font-medium text-brand-navy">{usd(v)}</span>
                </li>
              ))}
            </ul>
            {r.mgmt > 0 && (
              <p className="mt-3 text-xs text-gray-500">
                Housing includes an estimated building management fee of {usd(r.mgmt)}.
              </p>
            )}
            <div className="mt-5 space-y-1.5 border-t pt-4">
              <p className="flex justify-between text-base font-semibold text-brand-navy">
                <span>Total per month</span>
                <span>{usd(r.total)}</span>
              </p>
              <p className="flex justify-between text-sm text-gray-600">
                <span>Per year</span>
                <span>{usd(r.total * 12)}</span>
              </p>
              <p className="flex justify-between text-sm text-gray-600">
                <span>In dong, per month</span>
                <span>≈ ₫{(Math.round((r.total * D.VND_PER_USD) / 100000) / 10).toLocaleString("en-US")}M</span>
              </p>
            </div>
            <p className="mt-3 text-xs text-gray-400">At about ₫{D.VND_PER_USD.toLocaleString("en-US")} per US$1.</p>
          </>
        )}
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children, single }: { icon: LucideIcon; title: string; children: React.ReactNode; single?: boolean }) {
  return (
    <section className="py-6">
      <h3 className="mb-5 flex items-center gap-3 text-base font-bold text-brand-navy">
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-100">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        {title}
      </h3>
      <div className={cn("grid grid-cols-1 gap-x-5 gap-y-5", !single && "sm:grid-cols-2")}>{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-brand-navy">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

function Choice({ value, onChange, options, placeholder }: { value: string; onChange: React.ChangeEventHandler<HTMLSelectElement>; options: D.Opt[]; placeholder: string }) {
  const empty = value === "";
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className={cn(
          "h-11 w-full appearance-none rounded-lg border px-3 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/30",
          empty ? "border-[#9EC5F0] bg-[#EEF4FB] text-[#7BA7D6]" : "border-gray-200 bg-white text-brand-navy",
        )}
      >
        {empty && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-brand-navy">
            {o.label}
          </option>
        ))}
      </select>
      <svg className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

function Money({ value, onChange, placeholder }: { value: string; onChange: React.ChangeEventHandler<HTMLInputElement>; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-700">$</span>
      <input
        inputMode="decimal"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-7 pr-3 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-primary/30"
      />
    </div>
  );
}
