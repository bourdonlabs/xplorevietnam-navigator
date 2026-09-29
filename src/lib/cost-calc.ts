// Cost of Living Calculator formula, shared by the client calculator and the admin client page.
import * as D from "./cost-data";

export type Inputs = Record<string, string>;
export const DEFAULTS: Inputs = {
  children: "0", helperHours: "0", eatOut: "0", coffees: "0", motorbikes: "0", cars: "0", driver: "no", pets: "0",
  doctorVisits: "0", visaRun: "120",
};

const num = (v?: string) => {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
export const find = <T extends D.Opt>(list: T[], v?: string) => list.find((o) => o.value === v);
const WEEKS = 4.33;

export function calculate(i: Inputs) {
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

