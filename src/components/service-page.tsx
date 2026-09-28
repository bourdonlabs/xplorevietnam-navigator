"use client";
// Building blocks shared by the individual-service pages (Tax Code, Bank Account),
// cloned from the StartAbroad NIF / Bank Account pages.
import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ChevronDown, CircleCheck, MapPin, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { STRIPE_ON } from "@/lib/services";

export function ServiceHeader({
  icon: Icon, title, subtitle, chips,
}: {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  chips: { icon: LucideIcon; label: string }[];
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-tint">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-brand-navy">{title}</h1>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-gray-600">{subtitle}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {chips.map((c) => (
            <span key={c.label} className="inline-flex items-center gap-1.5 rounded-full border bg-white px-3 py-1 text-xs text-gray-600">
              <c.icon className="h-3.5 w-3.5" />
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MethodChoice({
  question, options, value, onChange,
}: {
  question: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <p className="text-base text-brand-navy">{question}</p>
      <div className="mt-4 space-y-3" role="radiogroup">
        {options.map((o) => {
          const on = o.value === value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border-2 px-4 py-4 text-left transition-colors",
                on ? "border-brand-red bg-red-50" : "border-gray-200 hover:bg-gray-50",
              )}
            >
              <span className={cn("flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2", on ? "border-brand-red" : "border-gray-300")}>
                {on && <span className="h-2.5 w-2.5 rounded-full bg-brand-red" />}
              </span>
              <span className="text-base text-brand-navy">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PriceCard({
  price, caption, note, perPerson, people, setPeople, busy, onBuy, done,
}: {
  price: number;
  caption: string;
  note?: string;
  perPerson?: boolean;
  people?: number;
  setPeople?: (n: number) => void;
  busy: boolean;
  onBuy: () => void;
  done?: string | null;
}) {
  const n = people || 1;
  const box = "flex h-8 w-8 items-center justify-center rounded-md border text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40";
  return (
    <div className="flex flex-col rounded-xl border bg-white p-6 text-center shadow-sm">
      <p className="mt-4 text-3xl font-bold text-primary">${(price * n).toFixed(2)}</p>
      <p className="mt-1 text-sm text-gray-700">{caption}</p>
      {note && <p className="mt-3 text-sm text-gray-700">{note}</p>}
      {perPerson && setPeople && (
        <div className="mt-4 text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm text-gray-700">Number of people:</span>
            <div className="flex items-center gap-3">
              <button type="button" aria-label="Fewer people" className={box} disabled={n <= 1} onClick={() => setPeople(n - 1)}>
                -
              </button>
              <span className="w-4 text-center text-base text-brand-navy">{n}</span>
              <button type="button" aria-label="More people" className={box} disabled={n >= 10} onClick={() => setPeople(n + 1)}>
                +
              </button>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-700">${price} per person</p>
        </div>
      )}
      {done ? (
        <div className="mt-5 flex gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-left text-sm text-green-800">
          <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {done}
        </div>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={onBuy}
          className="mt-5 h-10 w-full rounded-md bg-brand-red text-sm font-semibold text-white transition-colors hover:bg-brand-red-hover disabled:opacity-60"
        >
          {busy ? "Please wait..." : "Get Started"}
        </button>
      )}
      {perPerson && !done && <p className="mt-3 text-xs font-semibold text-primary">You&apos;ll only pay once.</p>}
      <p className="mt-3 text-xs text-gray-600">
        {STRIPE_ON ? "Secure payment processing via Stripe" : "We'll confirm your request by email before you pay."}
      </p>
    </div>
  );
}

export function Faq({ items, className }: { items: [string, React.ReactNode][]; className?: string }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className={cn("rounded-xl border bg-white p-6 shadow-sm", className)}>
      <h2 className="text-2xl font-bold text-brand-navy">Frequently Asked Questions</h2>
      <div className="mt-4">
        {items.map(([q, a], i) => (
          <div key={q} className="border-b">
            <button
              type="button"
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 py-4 text-left text-base text-brand-navy hover:underline"
            >
              {q}
              <ChevronDown className={cn("h-4 w-4 flex-shrink-0 transition-transform", open === i && "rotate-180")} />
            </button>
            {open === i && <div className="pb-4 text-sm leading-relaxed text-brand-ink2">{a}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export function WhyCard({ title, lead, items, bottom }: { title: string; lead?: string; items: string[]; bottom?: string }) {
  return (
    <div className="rounded-xl border-2 border-primary bg-gradient-to-br from-blue-50 to-violet-50/60 p-6 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary">
          <CircleCheck className="h-6 w-6 text-white" />
        </span>
        <h3 className="text-2xl font-bold leading-tight text-brand-navy">{title}</h3>
      </div>
      <div className="mt-6 rounded-xl bg-white p-4">
        {lead && <p className="font-semibold text-brand-navy">{lead}</p>}
        <ul className="mt-4 space-y-5">
          {items.map((t) => (
            <li key={t} className="flex items-start gap-3 text-sm text-brand-ink2">
              <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-primary">
                <CircleCheck className="h-4 w-4 text-white" />
              </span>
              {t}
            </li>
          ))}
        </ul>
        {bottom && (
          <p className="mt-6 rounded-lg border-l-4 border-primary bg-blue-100 p-3 text-sm font-semibold text-brand-navy">{bottom}</p>
        )}
      </div>
    </div>
  );
}

export function StepGuide({
  title, intro, steps, aware,
}: {
  title: string;
  intro: string;
  steps: { title: string; text?: string; bullets?: string[]; warning?: string }[];
  aware?: string[];
}) {
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-brand-navy">{title}</h2>
      <p className="mt-4 text-base leading-relaxed text-brand-ink2">{intro}</p>
      <div className="mt-5 space-y-5">
        {steps.map((s) => (
          <div key={s.title} className="border-l-4 border-primary pl-4">
            <h4 className="font-semibold text-brand-navy">{s.title}</h4>
            {s.text && <p className="mt-2 text-sm leading-relaxed text-brand-ink2">{s.text}</p>}
            {s.bullets && (
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-brand-ink2">
                {s.bullets.map((b) => (
                  <li key={b}>{b}</li>
                ))}
              </ul>
            )}
            {s.warning && (
              <p className="mt-3 flex gap-2 rounded-r-lg border-l-4 border-orange-400 bg-orange-50 p-3 text-sm text-orange-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
                {s.warning}
              </p>
            )}
          </div>
        ))}
      </div>
      {aware && (
        <div className="mt-6 rounded-lg border border-brand-tint-line bg-brand-tint p-4">
          <h4 className="flex items-center gap-2 font-semibold text-brand-navy">
            <MapPin className="h-4 w-4 text-primary" /> Things to Be Aware Of
          </h4>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-primary">
            {aware.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function NumberedSteps({ steps }: { steps: { icon?: LucideIcon; title: string; text: string; time?: string }[] }) {
  return (
    <div className="space-y-4">
      {steps.map((s, i) => (
        <div key={s.title} className="flex gap-4 rounded-lg border border-brand-tint-line bg-brand-tint p-4">
          <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">{i + 1}</span>
          <div>
            <p className="flex items-center gap-2 text-base font-semibold text-brand-navy">
              {s.icon && <s.icon className="h-4 w-4" />}
              {s.title}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-brand-ink2">{s.text}</p>
            {s.time && <p className="mt-2 text-sm text-primary">{s.time}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

export function NextSteps({
  subtitle, cards,
}: {
  subtitle: string;
  cards: { icon: LucideIcon; title: string; text: string; cta: string; href: string }[];
}) {
  return (
    <section className="-mx-6 mt-12 border-t-4 border-primary bg-gray-50 px-6 py-14">
      <h2 className="text-center text-3xl font-bold text-brand-navy">Recommended Next Steps</h2>
      <p className="mt-3 text-center text-base text-gray-600">{subtitle}</p>
      <div className={cn("mx-auto mt-10 grid grid-cols-1 gap-6", cards.length === 3 ? "md:grid-cols-3" : "max-w-3xl md:grid-cols-2")}>
        {cards.map((c) => (
          <div key={c.title} className="rounded-xl border bg-white p-6 shadow-md">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
              <c.icon className="h-7 w-7 text-primary" />
            </span>
            <h3 className="mt-5 text-2xl font-bold leading-tight text-brand-navy">{c.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-gray-600">{c.text}</p>
            <Link href={c.href} className="mt-4 inline-block text-sm font-semibold text-primary hover:underline">
              {c.cta} →
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
