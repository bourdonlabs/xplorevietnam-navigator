"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, ChevronsUpDown, Clock, GraduationCap, Globe, Info, Mail, Package, Phone, Search } from "lucide-react";
import { CITIES, CURRICULA, SCHOOLS, type School } from "@/lib/schools";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type SortKey = "name" | "city" | "area" | "entry" | "max" | "languages" | "curriculum" | "feeLow" | "feeHigh" | "sen";

const LANGS = [
  { value: "english", label: "English", test: (l: string) => l === "English" },
  { value: "bilingual", label: "English / Vietnamese (bilingual)", test: (l: string) => /Vietnamese/.test(l) },
  { value: "french", label: "French", test: (l: string) => /French/.test(l) },
  { value: "german", label: "German", test: (l: string) => /German/.test(l) },
  { value: "korean", label: "Korean", test: (l: string) => /Korean/.test(l) },
  { value: "japanese", label: "Japanese", test: (l: string) => /Japanese/.test(l) },
  { value: "mandarin", label: "Mandarin", test: (l: string) => /Mandarin/.test(l) },
];

const money = (n: number | null) => (n == null ? "—" : "$" + n.toLocaleString("en-US"));
const age = (n: number | null) => (n == null ? "—" : n < 1 ? `${Math.round(n * 12)}m` : String(n));
const num = (v: string) => (v.trim() === "" ? null : Number(v));

export default function SchoolsPage() {
  const [q, setQ] = useState("");
  const [city, setCity] = useState("");
  const [lang, setLang] = useState("");
  const [curr, setCurr] = useState("");
  const [sen, setSen] = useState("");
  const [entry, setEntry] = useState("");
  const [through, setThrough] = useState("");
  const [feeMin, setFeeMin] = useState("");
  const [feeMax, setFeeMax] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });

  const rows = useMemo(() => {
    const e = num(entry);
    const t = num(through);
    const lo = num(feeMin);
    const hi = num(feeMax);
    const langTest = LANGS.find((l) => l.value === lang)?.test;
    const currTest = CURRICULA.find((c) => c.value === curr)?.match;
    const list = SCHOOLS.filter((s) => {
      if (q && !s.name.toLowerCase().includes(q.toLowerCase())) return false;
      if (city && s.city !== city) return false;
      if (langTest && !langTest(s.languages)) return false;
      if (currTest && !currTest.test(s.curriculum)) return false;
      if (sen && s.sen !== sen) return false;
      if (e != null && (s.entry == null || s.entry > e)) return false;
      if (t != null && (s.max == null || s.max < t)) return false;
      if (lo != null || hi != null) {
        if (s.feeLow == null || s.feeHigh == null) return false;
        if (lo != null && s.feeHigh < lo) return false;
        if (hi != null && s.feeLow > hi) return false;
      }
      return true;
    });
    return list.sort((a, b) => {
      const x = a[sort.key];
      const y = b[sort.key];
      if (x == null && y == null) return 0;
      if (x == null) return 1;
      if (y == null) return -1;
      return (typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y))) * sort.dir;
    });
  }, [q, city, lang, curr, sen, entry, through, feeMin, feeMax, sort]);

  const cols: { key: SortKey; label: string; right?: boolean }[] = [
    { key: "name", label: "School" },
    { key: "city", label: "City" },
    { key: "area", label: "Area" },
    { key: "entry", label: "Entry", right: true },
    { key: "max", label: "Max", right: true },
    { key: "languages", label: "Language(s)" },
    { key: "curriculum", label: "Curriculum / Accreditation" },
    { key: "feeLow", label: "Fee Low", right: true },
    { key: "feeHigh", label: "Fee High", right: true },
    { key: "sen", label: "SEN" },
  ];

  return (
    <div className="-m-6 bg-[#EEF4FB] p-6">
      <div className="mx-auto max-w-6xl space-y-7 py-4">
        <div className="rounded-xl bg-brand-navy px-6 py-11 text-center text-white">
          <h1 className="flex items-center justify-center gap-4 text-3xl font-bold md:text-4xl">
            <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-white/15">
              <GraduationCap className="h-5 w-5" />
            </span>
            Vietnam International Schools
          </h1>
          <p className="mt-5 text-base text-white/90">
            A searchable directory of {SCHOOLS.length} international schools across Ho Chi Minh City, Hanoi, Da Nang and Hoi An.
          </p>
        </div>

        <p className="text-base leading-relaxed text-brand-ink2">
          Vietnam has a large and growing international school scene, concentrated in Ho Chi Minh City and Hanoi. This list
          covers international schools and the international bilingual schools many expat families also consider. Vietnamese
          public schools and local private schools are not included. Use the list below to search and filter by city,
          curriculum, language, age range and fees. Fees are annual tuition in US dollars, converted from Vietnamese dong where
          schools publish in dong.
        </p>

        <div className="flex gap-4 rounded-xl border border-amber-300 bg-amber-50 p-5">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-4 w-4 text-amber-600" />
          </span>
          <div>
            <p className="font-semibold text-brand-navy">Apply earlier than you think</p>
            <p className="mt-1 text-sm text-brand-ink2">
              Most international schools here admit all year round, but popular year groups fill up and some keep waiting lists.
              For an August start, begin in January. The French lycée in Ho Chi Minh City has a fixed enrolment window in March.
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <F label="School name">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name..." className={cn(inputCls, "pl-9")} />
              </div>
            </F>
            <F label="City">
              <Sel value={city} onChange={setCity} all="All cities" options={CITIES.map((c) => ({ value: c, label: c }))} />
            </F>
            <F label="Primary language(s)">
              <Sel value={lang} onChange={setLang} all="All languages" options={LANGS} />
            </F>
            <F label="Curriculum">
              <Sel value={curr} onChange={setCurr} all="All curricula" options={CURRICULA} />
            </F>
            <F label="SEN support">
              <Sel value={sen} onChange={setSen} all="Any" options={["Yes", "No", "Unclear"].map((v) => ({ value: v, label: v }))} />
            </F>
            <F label="Accepts children by age">
              <input inputMode="numeric" value={entry} onChange={(e) => setEntry(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Entry age ≤" className={inputCls} />
            </F>
            <F label="Teaches through age">
              <input inputMode="numeric" value={through} onChange={(e) => setThrough(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="Max age ≥" className={inputCls} />
            </F>
            <F label="Annual fee ($)">
              <div className="flex items-center gap-2">
                <input inputMode="numeric" value={feeMin} onChange={(e) => setFeeMin(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Min" className={inputCls} />
                <span className="text-gray-500">–</span>
                <input inputMode="numeric" value={feeMax} onChange={(e) => setFeeMax(e.target.value.replace(/[^0-9]/g, ""))} placeholder="Max" className={inputCls} />
              </div>
            </F>
          </div>
          <p className="mt-5 text-sm text-brand-navy">
            Showing <strong>{rows.length}</strong> of {SCHOOLS.length} schools
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-xl border border-brand-tint-line bg-brand-tint/60 p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-3 text-base text-brand-navy">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Phone className="h-4 w-4 text-primary" />
            </span>
            Have questions about how to move to Vietnam with kids? Book a consultation with us.
          </p>
          <Link href="/vietnam/consultation" className="inline-flex h-10 flex-shrink-0 items-center gap-2 self-start rounded-md bg-brand-red px-4 text-sm font-semibold text-white hover:bg-brand-red-hover sm:self-auto">
            Book a consultation <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-brand-navy text-white">
                <tr>
                  {cols.map((c) => {
                    const on = sort.key === c.key;
                    return (
                      <th key={c.key} className={cn("px-3 py-3 font-semibold uppercase tracking-wider text-[11px]", c.right ? "text-right" : "text-left")}>
                        <button
                          type="button"
                          onClick={() => setSort({ key: c.key, dir: on ? ((sort.dir * -1) as 1 | -1) : 1 })}
                          className={cn("inline-flex items-center gap-1 whitespace-nowrap uppercase tracking-wider", c.right && "flex-row-reverse")}
                        >
                          {c.label}
                          {on ? sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : <ChevronsUpDown className="h-3 w-3 opacity-50" />}
                        </button>
                      </th>
                    );
                  })}
                  <th className="px-3 py-3 text-left text-[11px] font-semibold uppercase tracking-wider">Contact</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s, i) => (
                  <Row key={s.name} s={s} alt={i % 2 === 1} />
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-10 text-center text-gray-500">
                      No schools match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-xs text-gray-600">
          Fees are annual tuition for the most recent year each school published, converted from Vietnamese dong at about ₫26,300 per
          US$1, and exclude application, enrolment and development fees. Where fees are not included, they are either not published
          or we could not verify them. Please follow up directly with the school for more information.
        </p>

        <div className="rounded-xl bg-brand-navy p-7 text-white">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
            <Package className="h-4 w-4" />
          </span>
          <p className="mt-4 max-w-3xl text-base leading-relaxed">
            Looking for a home near your chosen school, or want dedicated support throughout the process? Our Get to Vietnam and
            Concierge packages include rental search support and a dedicated relocation specialist.
          </p>
          <Link href="/vietnam/relocation-packages" className="mt-5 inline-flex h-10 items-center gap-2 rounded-md bg-brand-red px-4 text-sm font-semibold text-white hover:bg-brand-red-hover">
            Explore our packages <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

const inputCls = "h-11 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-brand-navy outline-none focus:ring-2 focus:ring-primary/30";

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-brand-navy">{label}</span>
      {children}
    </label>
  );
}

function Sel({ value, onChange, all, options }: { value: string; onChange: (v: string) => void; all: string; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <select value={value} onChange={(e) => onChange(e.target.value)} className={cn(inputCls, "appearance-none pr-9")}>
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
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

function Row({ s, alt }: { s: School; alt: boolean }) {
  const icon = "rounded p-1 text-brand-navy hover:bg-gray-100";
  return (
    <tr className={cn("border-b align-top text-brand-navy", alt && "bg-[#F8FAFC]")}>
      <td className="w-40 px-3 py-3">{s.name}</td>
      <td className="whitespace-nowrap px-3 py-3">{s.city}</td>
      <td className="w-36 px-3 py-3">{s.area}</td>
      <td className="px-3 py-3 text-right">{age(s.entry)}</td>
      <td className="px-3 py-3 text-right">{age(s.max)}</td>
      <td className="px-3 py-3">{s.languages}</td>
      <td className="w-52 px-3 py-3">{s.curriculum}</td>
      <td className="whitespace-nowrap px-3 py-3 text-right">{money(s.feeLow)}</td>
      <td className="whitespace-nowrap px-3 py-3 text-right">{money(s.feeHigh)}</td>
      <td className="px-3 py-3">{s.sen}</td>
      <td className="px-3 py-3">
        <div className="flex items-center gap-0.5">
          {s.website && (
            <a href={s.website} target="_blank" rel="noopener" aria-label={`${s.name} website`} className={icon}>
              <Globe className="h-4 w-4" />
            </a>
          )}
          {s.email && (
            <a href={`mailto:${s.email}`} aria-label={`Email ${s.name}`} className={icon}>
              <Mail className="h-4 w-4" />
            </a>
          )}
          {s.phone && (
            <a href={`tel:${s.phone.replace(/[^+0-9]/g, "")}`} aria-label={`Call ${s.name}`} title={s.phone} className={icon}>
              <Phone className="h-4 w-4" />
            </a>
          )}
          <Popover>
            <PopoverTrigger aria-label={`More about ${s.name}`} className={icon}>
              <Info className="h-4 w-4" />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 text-sm">
              <p className="font-semibold text-brand-navy">{s.name}</p>
              {s.notes && <p className="mt-2 text-brand-ink2">{s.notes}</p>}
              <p className="mt-2 text-xs text-gray-500">
                {s.feeYear ? `Fees: ${s.feeYear} school year.` : "Fees not published."} {s.phone && `Phone: ${s.phone}.`}
              </p>
              {s.email && <p className="mt-1 text-xs text-gray-500">Email: {s.email}</p>}
              <a href={s.source} target="_blank" rel="noopener" className="mt-2 inline-block text-xs text-primary underline">
                Source
              </a>
            </PopoverContent>
          </Popover>
        </div>
      </td>
    </tr>
  );
}
