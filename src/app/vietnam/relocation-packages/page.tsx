"use client";
import Link from "next/link";
import { ArrowRight, BarChart3, Check, ShieldCheck, Star } from "lucide-react";
import { REVIEWS } from "@/lib/reviews";
import { SERVICE_CATALOG } from "@/lib/services";
import { cn, siteLink } from "@/lib/utils";

// Package names, prices, "best for", payment terms and "you get" text are the website's (relocate page).
const PACKAGES = [
  {
    name: "Visa Package",
    types: "E-visa · Work · Investor · Family",
    best: "People who are confident managing their own move but want an expert handling the immigration process.",
    price: 975,
    addons: "Dependents, Tax Code, Bank Account, Driving Licence",
    terms: ["Payment due in full at booking"],
    get: "The visa is the part of this process you cannot afford to get wrong. We choose the right route for your circumstances, prepare your documents to a standard that holds up to scrutiny, file your application and follow it up with the immigration office until it’s approved.",
  },
  {
    name: "Get to Vietnam Package",
    types: "Work · Investor · Family",
    best: "People who want the critical parts handled by experts and are comfortable managing the day-to-day of the move themselves.",
    price: 2450,
    addons: "Dependents, Tax Code, Bank Account, Driving Licence",
    terms: ["Payment due in full at booking"],
    get: "You’ll arrive with your visa approved, a home lined up, and a bank account open. We’re in regular contact throughout, so you always know where things stand. Not every detail is managed for you, but the ones that can derail a move are.",
  },
  {
    name: "Concierge Package",
    types: "Work · Investor · Family",
    best: "Families, couples, and professionals who want one trusted person handling the entire move — not a checklist to manage themselves.",
    price: 4750,
    addons: "Dependents",
    terms: ["Pay 70% at booking", "Pay 30% after your visa application is submitted"],
    get: "Moving countries involves a thousand decisions, and the hardest ones are the ones you don’t know to ask about yet. As a Concierge client, you have a dedicated relocation specialist in your corner from day one: someone who knows what you’ll need before you need it, and is reachable on WhatsApp when anything comes up.",
    featured: "Full Service",
  },
];

export default function RelocationPackagesPage() {
  const review = SERVICE_CATALOG.visa_review;
  return (
    <div className="mx-auto max-w-6xl space-y-10 pt-6">
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        <h1 className="text-3xl font-bold leading-snug text-brand-navy md:text-4xl md:leading-[1.45]">
          You&apos;ve got the groundwork done.
          <br />
          Here&apos;s how we take it from here.
        </h1>
        <a
          href={siteLink("relocate.html#compare")}
          target="_blank"
          rel="noopener"
          className="inline-flex h-10 flex-shrink-0 items-center gap-2 self-start rounded-full bg-brand-red px-5 text-sm font-semibold text-white hover:bg-brand-red-hover"
        >
          Compare Packages <ArrowRight className="h-4 w-4" />
        </a>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 pt-4 md:grid-cols-3">
        {PACKAGES.map((p) => (
          <div
            key={p.name}
            className={cn(
              "flex flex-col overflow-hidden rounded-xl bg-white shadow-sm",
              p.featured ? "border-2 border-primary shadow-lg md:-mt-4" : "border",
            )}
          >
            {p.featured && <div className="bg-primary py-2 text-center text-sm font-semibold text-white">{p.featured}</div>}
            <div className="flex flex-1 flex-col p-6">
              <h2 className={cn("text-2xl font-semibold", p.featured ? "text-primary" : "text-brand-navy")}>{p.name}</h2>
              <p className="mt-1 text-sm text-gray-700">{p.types}</p>
              <p className="mt-5 text-base leading-relaxed text-brand-ink2">
                <strong className="text-brand-navy">Best for:</strong> {p.best}
              </p>
              <p className="mt-6 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-brand-navy">${p.price}</span>
                <span className="text-sm text-gray-700">/ total</span>
              </p>
              <p className="mt-2 text-xs text-gray-700">
                Government application fees
                <br />
                (~$350/applicant) not included.
              </p>
              <span className="mt-3 self-start rounded-lg bg-orange-50 px-2.5 py-1 text-xs text-orange-600">Optional add-on: {p.addons}</span>
              <ul className="mt-3 space-y-1.5">
                {p.terms.map((t) => (
                  <li key={t} className="flex gap-2 text-sm text-brand-ink2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-500" />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="my-6 border-t" />
              <p className="flex-1 text-base leading-relaxed text-brand-ink2">{p.get}</p>
              <a
                href={siteLink("relocate.html#packages")}
                target="_blank"
                rel="noopener"
                className="mt-8 flex h-10 w-full items-center justify-center gap-2 rounded-full border border-brand-navy text-sm font-semibold text-brand-navy hover:bg-gray-50"
              >
                Get started <ArrowRight className="h-4 w-4" />
              </a>
              <Link href="/vietnam/consultation" className="mt-3 text-center text-sm text-primary underline">
                Have questions? Talk to an expert.
              </Link>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-700">
        *Our fee does not include government application fees. These are approximately $350 per applicant.
      </p>

      <div className="flex flex-col gap-5 rounded-xl border border-brand-tint-line bg-brand-tint p-6 sm:flex-row sm:items-start">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white">
          <ShieldCheck className="h-5 w-5 text-primary" />
        </span>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-brand-navy">Just want your visa application checked? Try a Visa Packet Review</h3>
          <p className="mt-2 text-base leading-relaxed text-brand-ink2">
            Have our visa experts review your documents before you apply — get a written assessment within 3 business days plus a
            30-minute expert call, ideal for movers who want confidence in their paperwork without full-service support.
          </p>
        </div>
        <div className="flex-shrink-0 sm:text-right">
          <p className="text-2xl font-bold text-brand-navy">${review.unitUsd}</p>
          <p className="text-xs text-gray-700">+ ${review.perDependentUsd} per dependent</p>
          <Link href="/vietnam/visa" className="mt-2 inline-block text-sm text-primary underline">
            Get a Visa Packet Review →
          </Link>
        </div>
      </div>

      <div className="flex justify-center">
        <a
          href={siteLink("relocate.html#compare")}
          target="_blank"
          rel="noopener"
          className="inline-flex h-11 items-center gap-3 rounded-md border border-primary bg-white px-8 text-sm text-primary hover:bg-brand-tint"
        >
          <BarChart3 className="h-4 w-4" /> Compare all packages
        </a>
      </div>

      <div className="rounded-xl border border-brand-tint-line bg-brand-tint/60 p-8">
        <p className="flex items-center justify-center gap-2 text-lg font-semibold text-brand-navy">
          <ShieldCheck className="h-5 w-5 text-primary" /> 150+ clients relocated
        </p>
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {REVIEWS.slice(0, 3).map((r) => (
            <div key={r.name} className="flex flex-col rounded-xl bg-white p-5 shadow-sm">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-brand-ink2">&ldquo;{r.text}&rdquo;</p>
              <div className="mt-5 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={r.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
                <p className="font-semibold text-brand-navy">{r.name}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-10 text-center shadow-sm">
        <h3 className="text-2xl font-semibold text-brand-navy">Not sure what type of support you need?</h3>
        <p className="mt-3 text-base text-primary">Get in touch with an expert.</p>
        <Link
          href="/vietnam/consultation"
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-md bg-brand-red px-8 text-sm font-semibold text-white hover:bg-brand-red-hover"
        >
          Talk to an expert <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
