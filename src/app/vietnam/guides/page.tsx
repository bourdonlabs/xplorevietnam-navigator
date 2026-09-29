"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight, Eye, GraduationCap, Heart, House, Languages, MapPin, PawPrint, Plane, Receipt, Stamp, Wallet,
  type LucideIcon,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { GUIDES, type Guide, type Tone } from "@/lib/guides";
import { cn, siteLink } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  stamp: Stamp, house: House, wallet: Wallet, heart: Heart, school: GraduationCap, paw: PawPrint, plane: Plane,
  receipt: Receipt, pin: MapPin, languages: Languages,
};

// Full class strings so Tailwind keeps them.
const TONES: Record<Tone, string> = {
  indigo: "bg-indigo-50 border-indigo-200 text-indigo-600",
  blue: "bg-blue-50 border-blue-200 text-blue-600",
  violet: "bg-violet-50 border-violet-200 text-violet-600",
  rose: "bg-rose-50 border-rose-200 text-rose-600",
  amber: "bg-amber-50 border-amber-200 text-amber-600",
  emerald: "bg-emerald-50 border-emerald-200 text-emerald-600",
  cyan: "bg-cyan-50 border-cyan-200 text-cyan-600",
  orange: "bg-orange-50 border-orange-200 text-orange-600",
  fuchsia: "bg-fuchsia-50 border-fuchsia-200 text-fuchsia-600",
  teal: "bg-teal-50 border-teal-200 text-teal-600",
};

const cta = "flex h-8 items-center justify-center gap-2 rounded-md bg-brand-red text-sm font-medium text-white transition-colors hover:bg-brand-red-hover";
const outline = "flex h-8 items-center justify-center gap-2 rounded-md border border-gray-200 bg-white text-sm text-brand-navy transition-colors hover:bg-gray-50";

function GuideIcon({ g, size = "h-14 w-14" }: { g: Guide; size?: string }) {
  const Icon = ICONS[g.icon] || Stamp;
  return (
    <span className={cn("flex flex-shrink-0 items-center justify-center rounded-lg border", size, TONES[g.tone])}>
      <Icon className="h-6 w-6" strokeWidth={1.75} />
    </span>
  );
}

export default function GuidesPage() {
  const [preview, setPreview] = useState<Guide | null>(null);

  return (
    <div className="mx-auto max-w-[1152px] space-y-8 py-2">
      <div className="max-w-[620px] space-y-3">
        <h1 className="text-4xl font-bold text-brand-navy">Expert Guides</h1>
        <p className="text-base leading-relaxed text-brand-navy md:text-lg">
          Expert-written guides to help you avoid common mistakes, save time, and move with confidence.{" "}
          <span className="text-primary">Created by our Vietnam relocation specialists and updated regularly.</span>
        </p>
      </div>

      <div className="rounded-lg border border-brand-sky/60 bg-brand-tint px-4 py-3.5 text-sm leading-relaxed text-brand-navy">
        Preview what each guide covers, then read the full guide free on our website. Guides open in a new tab, so you
        won&apos;t lose your place in Navigator.
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {GUIDES.map((g) => (
          <div key={g.slug} className="flex flex-col rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <GuideIcon g={g} />
            <h2 className="mt-5 text-[17px] font-semibold leading-snug text-brand-navy">{g.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-brand-ink2">{g.text}</p>
            <div className="mt-auto pt-5">
              {g.minutes && <p className="mb-3 text-xs text-primary">{g.minutes} min read</p>}
              {g.href ? (
                <Link href={g.href} className={cta}>
                  {g.cta}
                </Link>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setPreview(g)} className={outline}>
                    <Eye className="h-4 w-4" /> Preview
                  </button>
                  <a href={siteLink(g.path!)} target="_blank" rel="noopener" className={cta}>
                    Read full guide <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto rounded-xl">
          {preview && (
            <div className="space-y-5">
              <div className="flex items-start gap-4 pr-6">
                <GuideIcon g={preview} size="h-12 w-12" />
                <div>
                  <DialogTitle className="text-xl font-bold leading-snug text-brand-navy">{preview.title}</DialogTitle>
                  <p className="mt-1 text-xs text-primary">{preview.minutes} min read</p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-brand-ink2">{preview.intro}</p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">What&apos;s inside</p>
                <ol className="mt-3 space-y-2">
                  {preview.sections?.map((s, i) => (
                    <li key={s} className="flex gap-3 text-sm text-brand-navy">
                      <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-brand-tint text-[11px] font-semibold text-primary">
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="grid grid-cols-2 gap-2 border-t pt-5">
                <button type="button" onClick={() => setPreview(null)} className={cn(outline, "h-10")}>
                  Close
                </button>
                <a href={siteLink(preview.path!)} target="_blank" rel="noopener" className={cn(cta, "h-10")}>
                  Read full guide <ArrowUpRight className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
