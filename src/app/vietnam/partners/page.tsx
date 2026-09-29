"use client";
import { useState } from "react";
import {
  Activity, CircleDollarSign, Clock, ExternalLink, FileText, Globe, Handshake, Mail, MessageSquare, PawPrint, Truck,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES, LESSON, PARTNERS, type Partner } from "@/lib/partners";
import { SUPPORT_EMAIL, cn } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  activity: Activity, file: FileText, dollar: CircleDollarSign, globe: Globe, chat: MessageSquare, paw: PawPrint, truck: Truck,
};

// A category shows when it has partners (or, for Vietnamese Lessons, the featured lesson).
const hasContent = (key: string) => PARTNERS.some((p) => p.category === key) || key === "vietnamese";

export default function PartnersPage() {
  const [filter, setFilter] = useState("all");
  const visible = CATEGORIES.filter((c) => hasContent(c.key));
  const shown = filter === "all" ? visible : visible.filter((c) => c.key === filter);

  return (
    <div className="mx-auto max-w-[1000px] space-y-10 py-4">
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-tint">
          <Handshake className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-brand-navy">Partners</h1>
          <p className="mt-2 text-base text-gray-600">Our vetted network of local experts to support every step of your move to Vietnam.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {[{ key: "all", title: "All Services" }, ...visible].map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => setFilter(c.key)}
            className={cn(
              "rounded-full border px-4 py-2 text-sm transition-colors",
              filter === c.key ? "border-primary bg-primary text-white" : "border-gray-200 bg-white text-brand-navy hover:bg-gray-50",
            )}
          >
            {c.title}
          </button>
        ))}
      </div>

      {shown.map((c) => {
        const Icon = ICONS[c.icon] || FileText;
        const partners = PARTNERS.filter((p) => p.category === c.key);
        return (
          <section key={c.key} id={c.key} className="scroll-mt-6 space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-brand-tint">
                <Icon className="h-4 w-4 text-primary" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-brand-navy">{c.title}</h2>
                <p className="text-sm text-gray-600">{c.subtitle}</p>
              </div>
            </div>
            {c.key === "vietnamese" && <LessonFeature />}
            {partners.length > 0 && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {partners.map((p) => (
                  <PartnerCard key={p.name} p={p} icon={Icon} />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {visible.length < CATEGORIES.length && (
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" /> More partners are being added. Need help with something not listed?{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary underline">
            Email us
          </a>
        </p>
      )}
    </div>
  );
}

function PartnerCard({ p, icon: Icon }: { p: Partner; icon: LucideIcon }) {
  return (
    <div className="flex flex-col rounded-xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-tint">
          <Icon className="h-5 w-5 text-primary" />
        </span>
        {p.tag && (
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            {p.tag}
          </span>
        )}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-brand-navy">{p.name}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-brand-ink2">{p.text}</p>
      {p.action === "visit" ? (
        <a
          href={p.url}
          target="_blank"
          rel="noopener"
          className="mt-5 flex h-10 items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-white hover:bg-primary/90"
        >
          <ExternalLink className="h-4 w-4" /> {p.cta || `Visit ${p.name}`}
        </a>
      ) : (
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Introduction to ${p.name}`)}`}
          className="mt-5 flex h-10 items-center justify-center gap-2 rounded-md border text-sm font-medium text-brand-navy hover:bg-gray-50"
        >
          <Mail className="h-4 w-4" /> Request Introduction
        </a>
      )}
    </div>
  );
}

function LessonFeature() {
  const [play, setPlay] = useState(false);
  const L = LESSON;
  return (
    <div className="grid grid-cols-1 overflow-hidden rounded-xl bg-white shadow-sm md:grid-cols-2">
      <div className="relative aspect-video bg-black md:aspect-auto md:min-h-[360px]">
        {play ? (
          <iframe
            className="absolute inset-0 h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${L.youtubeId}?autoplay=1&rel=0`}
            title={L.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0" aria-label={`Play: ${L.title}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${L.youtubeId}/hqdefault.jpg`} alt="" className="h-full w-full object-cover" />
            <span className="absolute left-1/2 top-1/2 flex h-14 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl bg-[#FF0000] shadow-lg transition-transform group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="white">
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-col p-7">
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
          <span className="h-px w-6 bg-emerald-700" /> {L.label}
        </p>
        <h3 className="mt-3 text-xl font-semibold text-brand-navy">{L.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-brand-ink2">{L.text}</p>
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
          {L.meta.map((m) => (
            <span key={m}>{m}</span>
          ))}
        </p>
        <div className="my-5 border-t" />
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Recommended learning partner</p>
        <h4 className="mt-2 text-base font-semibold text-brand-navy">{L.partner.name}</h4>
        <p className="mt-1 text-sm leading-relaxed text-brand-ink2">{L.partner.text}</p>
        <a
          href={L.partner.url}
          target="_blank"
          rel="noopener"
          className="mt-5 flex h-11 items-center justify-center gap-2 rounded-md bg-primary text-sm font-medium text-white hover:bg-primary/90"
        >
          <ExternalLink className="h-4 w-4" /> {L.partner.cta}
        </a>
      </div>
    </div>
  );
}
