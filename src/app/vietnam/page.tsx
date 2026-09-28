"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight, Calendar, Check, Clock, Info, Mail, MessageCircle, Pencil, Phone, User,
} from "lucide-react";
import { toast } from "sonner";
import { backend } from "@/lib/backend";
import { buildJourney, formatDate, formatLongDate, milestones } from "@/lib/journey";
import { SUPPORT_EMAIL, cn } from "@/lib/utils";
import { VnFlag } from "@/components/brand";
import { usePortal } from "@/components/portal-context";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// Welcome video: set NEXT_PUBLIC_WELCOME_VIDEO_URL (an .mp4 in Supabase Storage, like StartAbroad) when it's recorded.
const VIDEO_URL = process.env.NEXT_PUBLIC_WELCOME_VIDEO_URL || "";

export default function Dashboard() {
  const { user, profile, saveProfile } = usePortal();
  const [done, setDone] = useState<Set<number>>(new Set());
  const [playing, setPlaying] = useState(false);
  const [editDate, setEditDate] = useState(false);
  const [dateDraft, setDateDraft] = useState("");
  const journeyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    backend.getProgress(user.id).then((ids) => setDone(new Set(ids)));
  }, [user.id]);

  const visaType = profile?.visa_type || null;
  const moveDate = profile?.anticipated_move_date || null;
  const items = useMemo(() => buildJourney(visaType, moveDate), [visaType, moveDate]);
  const steps = useMemo(() => milestones(visaType), [visaType]);

  const doneCount = items.filter((i) => done.has(i.id)).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;
  const current = items.findIndex((i) => !done.has(i.id));
  const allDone = (ids: number[]) => {
    const present = ids.filter((id) => items.some((i) => i.id === id));
    return present.length > 0 && present.every((id) => done.has(id));
  };

  const toggle = async (id: number) => {
    const next = new Set(done);
    const on = !next.has(id);
    if (on) next.add(id);
    else next.delete(id);
    setDone(next);
    await backend.setItemDone(user.id, id, on);
  };

  const saveDate = async () => {
    if (!dateDraft) return;
    if (await saveProfile({ anticipated_move_date: dateDraft })) {
      setEditDate(false);
      toast.success("Move date updated");
    }
  };

  return (
    <>
      {/* Welcome + milestone tracker */}
      <div className="rounded-xl border border-gray-100 bg-white px-6 py-6 shadow-sm">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint">
              <VnFlag className="h-4 w-6" />
            </div>
            <div>
              <h1 className="text-[26px] font-bold leading-tight text-brand-navy">
                Welcome{profile?.first_name ? `, ${profile.first_name}` : ""}!
              </h1>
              <p className="text-[16px] text-gray-500">
                {profile?.move_stage === "moved" ? "Let's get you settled in Vietnam" : "Let's get you to Vietnam"}
              </p>
            </div>
          </div>
          {doneCount === 0 ? (
            <div className="flex flex-col items-start gap-2 pt-1 sm:items-end">
              <p className="max-w-[240px] text-[13px] text-gray-500 sm:text-right">
                Your portal is ready — begin with your first step below.
              </p>
              <button
                onClick={() => journeyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-md bg-brand-red px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-red-hover"
              >
                Get Started
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-shrink-0 items-start gap-4 pt-1 sm:gap-8">
              <div className="text-right">
                <div className="text-2xl font-bold leading-none text-brand-navy sm:text-[32px]">{doneCount}</div>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">Tasks Done</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold leading-none text-brand-navy sm:text-[32px]">{pct}%</div>
                <p className="mt-1 text-[11px] uppercase tracking-wider text-gray-500">Complete</p>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-[#F8FAFC] px-4 py-5">
          <div className="hidden items-center justify-between sm:flex">
            {steps.map((m, i, arr) => {
              const on = allDone(m.itemIds);
              const nextOn = !!arr[i + 1] && allDone(arr[i + 1].itemIds);
              return (
                <div key={m.label} className="flex flex-1 items-center last:flex-none">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                        on ? "bg-primary text-white" : "border-2 border-gray-200 bg-white text-gray-300",
                      )}
                    >
                      {on ? <Check className="h-5 w-5" /> : <div className="h-2 w-2 rounded-full bg-gray-300" />}
                    </div>
                    <span className={cn("mt-2 whitespace-nowrap text-center text-xs font-medium", on ? "text-brand-navy" : "text-gray-500")}>
                      {m.label}
                    </span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className="relative mx-2 mb-6 h-0.5 flex-1 bg-gray-200">
                      <div className="absolute inset-0 bg-primary transition-all" style={{ width: on && nextOn ? "100%" : on ? "50%" : "0%" }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-col sm:hidden">
            {steps.map((m, i, arr) => {
              const on = allDone(m.itemIds);
              return (
                <div key={m.label} className="flex items-start gap-3">
                  <div className="flex flex-col items-center self-stretch">
                    <div
                      className={cn(
                        "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full transition-all",
                        on ? "bg-primary text-white" : "border-2 border-gray-200 bg-white text-gray-300",
                      )}
                    >
                      {on ? <Check className="h-4 w-4" /> : <div className="h-2 w-2 rounded-full bg-gray-300" />}
                    </div>
                    {i < arr.length - 1 && <div className={cn("my-1 w-0.5 flex-1", on ? "bg-primary" : "bg-gray-200")} />}
                  </div>
                  <span className={cn("pb-2 pt-1.5 text-sm font-medium", on ? "text-brand-navy" : "text-gray-500")}>{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Welcome video */}
          <div className="relative overflow-hidden rounded-xl bg-black shadow-md">
            {playing && VIDEO_URL ? (
              <div className="aspect-video">
                <video className="h-full w-full object-cover" controls autoPlay src={VIDEO_URL} />
              </div>
            ) : (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/video-thumb.jpg" alt="Welcome to XploreVietnam" className="aspect-video h-auto w-full object-cover" />
                <button
                  onClick={() => (VIDEO_URL ? setPlaying(true) : toast("Your welcome video is on its way."))}
                  className="group absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
                  aria-label="Play welcome video"
                >
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 shadow-lg transition-transform group-hover:scale-110">
                    <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7" fill="#0042C3" stroke="#0042C3" strokeWidth="2" strokeLinejoin="round">
                      <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                  </div>
                </button>
              </div>
            )}
          </div>

          {/* Move date: anchors every date in the journey */}
          <Card className="mt-8 border-0 bg-white shadow-sm transition-shadow duration-200 hover:shadow-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-tint">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold text-brand-navy">
                      {profile?.move_stage === "moved" ? "Arrival Date" : "Planned Move Date"}
                    </CardTitle>
                    <p className="mt-1 text-xl font-bold text-primary">
                      {moveDate ? formatLongDate(new Date(moveDate + "T00:00:00")) : "Not set"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary"
                  onClick={() => {
                    setDateDraft(moveDate || "");
                    setEditDate((v) => !v);
                  }}
                >
                  <Pencil className="mr-1 h-4 w-4" />
                  Edit
                </Button>
              </div>
              {editDate && (
                <div className="flex flex-col gap-2 pt-3 sm:flex-row">
                  <Input type="date" value={dateDraft} onChange={(e) => setDateDraft(e.target.value)} className="sm:max-w-[220px]" />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveDate} disabled={!dateDraft} className="h-10 flex-1">
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEditDate(false)} className="h-10 flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-xs text-gray-500">All timeline dates are calculated from this date</p>
              {!moveDate && (
                <Link href="/vietnam/consultation" className="mt-2 block text-xs text-primary hover:underline">
                  Not sure when you&apos;ll move? Book a free consultation
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Journey checklist */}
          <Card id="your-journey" ref={journeyRef} className="mt-8 scroll-mt-6 border-0 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-brand-navy">Your Journey</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-gray-200">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-sm font-medium text-gray-600">{pct}%</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-sm text-gray-500">Tick the boxes as you complete each step in your journey.</p>
              <div className="space-y-4">
                {items.map((it, i) => {
                  const isDone = done.has(it.id);
                  const isCurrent = i === current;
                  return (
                    <div key={it.id} className="group flex items-start space-x-4">
                      <div className="relative flex flex-shrink-0 items-center justify-center">
                        <button
                          aria-label={isDone ? `Mark "${it.title}" as not done` : `Mark "${it.title}" as done`}
                          onClick={() => toggle(it.id)}
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full",
                            isDone ? "bg-[#10B981]" : isCurrent ? "bg-primary" : "border-2 border-gray-300 bg-white hover:border-primary",
                          )}
                        >
                          {isDone && <Check className="h-6 w-6 text-white" />}
                          {!isDone && isCurrent && <Clock className="h-6 w-6 text-white" />}
                        </button>
                        {i < items.length - 1 && <div className="absolute left-5 top-10 h-full w-px bg-gray-200" />}
                      </div>
                      <div className="min-w-0 flex-1 pb-6">
                        <div
                          className={cn(
                            "flex flex-col rounded-lg border-2 p-4 sm:flex-row sm:items-start sm:justify-between",
                            isCurrent && !isDone
                              ? "border-primary bg-brand-tint"
                              : isDone
                                ? "border-[#10B981] bg-[#F0FDF4]"
                                : "border-gray-200 bg-white",
                          )}
                        >
                          <div className="flex-1">
                            <p className={cn("mb-1 text-[16px] font-semibold", isDone ? "text-[#10B981]" : "text-brand-navy")}>{it.title}</p>
                            <p className="mb-2 text-[14px] leading-relaxed text-brand-ink2">{it.description}</p>
                            {it.cta && (
                              <Link href={it.cta.href} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
                                {it.cta.label}
                              </Link>
                            )}
                          </div>
                          <div className="mt-2 flex items-center sm:ml-4 sm:mt-0">
                            <span className="text-xs text-gray-500 sm:whitespace-nowrap sm:text-right">
                              {it.date ? formatDate(it.date) : it.dateText}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="mt-4 text-caption text-gray-600">
                * Dates are estimates. Vietnamese immigration rules change often, so always confirm the current requirements before you apply.
              </p>
            </CardContent>
          </Card>

          {/* Time limits */}
          <div className="rounded-xl border border-brand-tint-line bg-brand-tint p-5 sm:p-6">
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-brand-tint-line bg-white">
                <Info className="h-4 w-4 text-primary" />
              </div>
              <h3 className="pt-1 text-[17px] font-bold text-brand-navy">Important Time Limits to Keep in Mind</h3>
            </div>
            <ul className="space-y-3 pl-2 text-[14px] leading-relaxed text-brand-ink2">
              {TIME_LIMITS.map(([k, v]) => (
                <li key={k} className="flex gap-2">
                  <span className="flex-shrink-0 text-primary">•</span>
                  <span>
                    <strong className="text-brand-navy">{k}:</strong> {v}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Upsell */}
          <div className="rounded-lg border-0 bg-brand-red text-white shadow-lg">
            <div className="space-y-6 p-6">
              <h3 className="text-center text-xl font-bold">
                Want hands-on help? Work one-on-one with a relocation specialist who helps you navigate every step
              </h3>
              <div className="mx-auto max-w-md">
                <Link href="/vietnam/relocation-packages" className={cn(buttonClass("outline", "lg"), "w-full border-0 bg-white text-brand-red hover:bg-white/90 hover:text-brand-red")}>
                  Get 1-on-1 support
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Specialist teaser (unlocks with a package) */}
        <div className="hidden space-y-6 lg:block">
          <Card className="relative overflow-hidden border border-gray-200 bg-gray-50">
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-100/50 p-6 backdrop-blur-[2px]">
              <div className="max-w-sm space-y-4 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                  <User className="h-7 w-7 text-brand-red" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Want hands-on help?</h4>
                <div className="space-y-2 text-sm text-gray-700">
                  <p className="font-medium">Get instant access to:</p>
                  <ul className="space-y-1 text-left">
                    <li className="flex items-center gap-2"><User className="h-4 w-4 text-brand-red" />Dedicated relocation specialist</li>
                    <li className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-green-600" />WhatsApp support</li>
                    <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" />Direct email access</li>
                    <li className="flex items-center gap-2"><Calendar className="h-4 w-4 text-purple-600" />Coaching calls</li>
                  </ul>
                </div>
                <Link href="/vietnam/relocation-packages" className={cn(buttonClass("cta"), "px-4")}>
                  Get 1-on-1 support
                </Link>
              </div>
            </div>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-400">Your Dedicated Relocation Specialist</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 text-center opacity-40">
                <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-gray-200 bg-gray-100 text-base font-medium text-brand-navy shadow-sm">
                  XV
                </span>
                <div>
                  <h3 className="text-base font-semibold text-brand-navy">XploreVietnam Team</h3>
                  <p className="text-sm text-gray-600">Relocation Specialist</p>
                </div>
                <div className="space-y-2">
                  <Button variant="outline" size="sm" disabled className="w-full justify-start border-gray-200 bg-transparent">
                    <Mail /> {SUPPORT_EMAIL}
                  </Button>
                  <Button variant="outline" size="sm" disabled className="w-full justify-start border-gray-200 bg-transparent">
                    <MessageCircle /> Contact via WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" disabled className="w-full justify-start border-gray-200 bg-transparent">
                    <Phone /> Schedule a Call
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// Every line below is taken from the XploreVietnam visas page.
const TIME_LIMITS: [string, string][] = [
  ["E-visa", "Valid for up to 90 days, with single or multiple entry. Overstaying, even by a few days, can lead to fines and problems with future applications."],
  ["Visa exemption", "Citizens of some countries can enter without a visa for up to 45 days. Check your own nationality before you travel."],
  ["Work permit", "Valid for up to 2 years and can be renewed. Your TRC is issued to match your permit."],
  ["Residence card (TRC)", "Usually valid for 1 to 10 years depending on the category: up to 2 years for work, up to 3 years for family, up to 10 years for the largest investors."],
  ["Permanent residence", "Limited mainly to people sponsored by a Vietnamese parent, spouse or child, after at least 3 years of continuous temporary residence."],
];
