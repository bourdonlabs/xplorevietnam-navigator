"use client";
import { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle, CircleCheck, FileText, Home, KeyRound, ListChecks, Lock, MapPin, Star, Users, Video,
  ChevronLeft, ChevronRight, type LucideIcon,
} from "lucide-react";
import { REVIEWS } from "@/lib/reviews";
import { cn } from "@/lib/utils";
import { MethodChoice, ServiceHeader, StepGuide } from "@/components/service-page";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// All service copy comes from the website's Real Estate and Rentals page ("Find Your Rental with XploreVietnam")
// and the packages comparison (rental search support: Get to Vietnam and Concierge).
const STEPS: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: FileText, title: "Define your criteria", text: "Tell us your city, preferred area, budget and must-haves." },
  { icon: Users, title: "Expert consultation", text: "A consultation about your lifestyle, priorities and budget, so we can help you choose the right area." },
  { icon: MapPin, title: "Property selection", text: "Up to 25 curated listings matching your criteria, sourced through our network of local contacts." },
  { icon: Video, title: "Property walkthroughs", text: "5 video or in-person walkthroughs, covering the apartment, the building and the surrounding area." },
  { icon: KeyRound, title: "Lease processing", text: "Landlord negotiation on your behalf, plus a full lease review and translation." },
  {
    icon: Home,
    title: "Move in and register your address",
    text: "Your landlord or building must declare your temporary residence to the police. Make sure this is done, as you may need it for your visa, residence card or bank account.",
  },
];

const INCLUDED = [
  "Up to 25 curated listings matching your criteria",
  "5 video or in-person property walkthroughs",
  "Landlord negotiation on your behalf",
  "Full lease review and translation",
  "Personal support from a dedicated relocation specialist",
  "Utility setup assistance available as an add-on",
];

// Local agents shown to clients. John to supply names, photos and areas.
const EXPERTS: { name: string; area: string; photo?: string }[] = [
  { name: "[Agent name]", area: "Ho Chi Minh City" },
  { name: "[Agent name]", area: "Hanoi" },
  { name: "[Agent name]", area: "Da Nang" },
  { name: "[Agent name]", area: "Hoi An" },
];

export default function RentalSearchPage() {
  const [method, setMethod] = useState("assist");

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <ServiceHeader
        icon={Home}
        title="Vietnam Rental Search"
        subtitle="Secure the right rental with local experts, or navigate the process on your own."
        chips={[
          { icon: Home, label: "150+ clients relocated" },
          { icon: ListChecks, label: "Up to 25 curated listings" },
        ]}
      />

      <MethodChoice
        question="How would you like to handle housing?"
        value={method}
        onChange={setMethod}
        options={[
          { value: "assist", label: "Have XploreVietnam assist with the search" },
          { value: "self", label: "I'll look for a rental myself" },
        ]}
      />

      <Tabs key={method} defaultValue={method === "self" ? "diy" : "search"}>
        <TabsList className="grid h-auto w-full grid-cols-2">
          <TabsTrigger value="search" className="py-2">Rental Search</TabsTrigger>
          <TabsTrigger value="diy" className="py-2">Find a Rental on Your Own</TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="mt-6">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
            <div className="space-y-8 lg:col-span-2">
              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-brand-navy">How It Works</h2>
                <p className="mt-1 text-sm text-brand-ink2">Our 6-step process to secure your rental in Vietnam</p>
                <ol className="mt-6 space-y-6">
                  {STEPS.map((s, i) => (
                    <li key={s.title} className="flex gap-4">
                      <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-primary">
                        {i + 1}
                      </span>
                      <div>
                        <p className="flex items-center gap-2 text-lg font-semibold text-brand-navy">
                          <s.icon className="h-5 w-5 text-primary" />
                          {s.title}
                        </p>
                        <p className="mt-1 text-base leading-relaxed text-brand-ink2">{s.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <div className="mt-8 flex gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-navy" />
                  <div className="text-sm text-brand-navy">
                    <p className="font-semibold">Important Timeline</p>
                    <p className="mt-0.5">
                      We recommend starting the process 4–6 weeks before you need to move in. Good apartments go quickly, and having
                      time to search properly makes a real difference.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-bold text-brand-navy">Our Experts on the Ground</h2>
                <p className="mt-1 text-sm text-brand-ink2">
                  Local rental and real estate specialists across Vietnam — ready to help you find the right home.
                </p>
                <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
                  {EXPERTS.map((e, i) => (
                    <div key={i} className="text-center">
                      {e.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.photo} alt="" className="mx-auto h-16 w-16 rounded-full border object-cover" />
                      ) : (
                        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border bg-brand-tint text-primary">
                          <Users className="h-6 w-6" />
                        </span>
                      )}
                      <p className="mt-2 text-sm font-semibold text-brand-navy">{e.name}</p>
                      <p className="text-xs text-gray-500">{e.area}</p>
                    </div>
                  ))}
                </div>
              </div>

              <ReviewCarousel />
            </div>

            <div className="rounded-xl border bg-white p-6 text-center shadow-sm">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
                <Lock className="h-5 w-5 text-brand-red" />
              </span>
              <h3 className="mt-4 text-lg font-semibold text-brand-navy">Included in our package service</h3>
              <p className="mt-1 text-sm text-brand-ink2">
                Rental search support is included in the Get to Vietnam and Concierge packages.
              </p>
              <ul className="mt-6 space-y-3 text-left">
                {INCLUDED.map((t) => (
                  <li key={t} className="flex gap-2 text-base text-brand-navy">
                    <CircleCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#10B981]" />
                    {t}
                  </li>
                ))}
              </ul>
              <Link
                href="/vietnam/relocation-packages"
                className="mt-6 flex h-11 w-full items-center justify-center rounded-md bg-brand-red text-sm font-semibold text-white hover:bg-brand-red-hover"
              >
                Upgrade to a package
              </Link>
              <p className="mt-4 text-sm text-gray-600">
                Already have a package? Your relocation specialist will start your rental search with you.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="diy" className="mt-6">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <StepGuide
                title="Finding a Rental on Your Own in Vietnam"
                intro="For most expats, renting is the right first step. It gives you time to learn your preferred area before committing to a purchase. Here's how renting in Vietnam typically works:"
                steps={[
                  {
                    title: "Step 1: Know How Leases Work",
                    bullets: [
                      "Most leases are signed for 6 to 12 months; shorter leases usually cost more per month",
                      "Contracts are often bilingual, in Vietnamese and English",
                      "Landlords typically require a security deposit of one to two months' rent, plus one to three months of rent in advance",
                      "Agent fees for rentals are usually paid by the landlord",
                    ],
                  },
                  {
                    title: "Step 2: Search Listings",
                    bullets: [
                      "There is no central listing system in Vietnam",
                      "The main websites are batdongsan.com.vn and Nhà Tốt (chotot.com); many rentals are found through agents and local Facebook groups",
                      "Searching remotely from abroad is common: most agents organise video walkthroughs for clients who haven't arrived yet",
                    ],
                    warning: "Photos and prices online are not always accurate, so always view a property, in person or by video, before paying.",
                  },
                  {
                    title: "Step 3: Prepare What Landlords Require",
                    bullets: ["A valid passport", "A valid visa or temporary residence card", "The deposit and first rent payment"],
                  },
                  {
                    title: "Step 4: Register Your Temporary Residence",
                    bullets: [
                      "By law, your landlord or building must declare your temporary residence to the police, usually within 12 hours of your arrival",
                      "Make sure this is done, as you may need it for your visa, residence card or bank account",
                    ],
                  },
                ]}
                aware={[
                  "Prices in popular expat areas such as Thao Dien, District 1 and Tay Ho have risen in recent years",
                  "Good apartments at fair prices move quickly, so start early and be ready to decide",
                  "We recommend a legal review of any lease before signing",
                ]}
              />
            </div>
            <div className="rounded-xl border bg-white p-6 text-center shadow-sm lg:self-start">
              <h3 className="text-lg font-semibold text-brand-navy">Rather have us handle it?</h3>
              <p className="mt-2 text-sm text-brand-ink2">
                Searching for a rental from abroad, in a fast-moving market and a language you may not speak, is one of the more
                stressful parts of moving. We make it easier.
              </p>
              <button
                type="button"
                onClick={() => setMethod("assist")}
                className="mt-5 h-10 w-full rounded-md bg-brand-red text-sm font-semibold text-white hover:bg-brand-red-hover"
              >
                See our rental search service
              </button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ReviewCarousel() {
  const [i, setI] = useState(0);
  const r = REVIEWS[i];
  const go = (d: number) => setI((i + d + REVIEWS.length) % REVIEWS.length);
  const nav = "flex h-8 w-8 items-center justify-center rounded-full border bg-white text-gray-600 hover:bg-gray-50";
  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-brand-navy">What Our Clients Say</h2>
      <p className="mt-1 text-sm text-brand-ink2">Real experiences from people who&apos;ve successfully moved to Vietnam with our help</p>
      <div className="mt-6 rounded-xl bg-brand-tint p-6">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }, (_, k) => (
            <Star key={k} className="h-4 w-4 fill-amber-400 text-amber-400" />
          ))}
        </div>
        <p className="mt-4 min-h-[130px] text-base leading-relaxed text-brand-ink2">&ldquo;{r.text}&rdquo;</p>
        <div className="mt-4 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={r.avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
          <p className="text-base text-brand-navy">{r.name}</p>
        </div>
      </div>
      <div className="mt-5 flex items-center justify-center gap-4">
        <button type="button" aria-label="Previous review" className={nav} onClick={() => go(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1.5">
          {REVIEWS.map((_, k) => (
            <button
              key={k}
              type="button"
              aria-label={`Review ${k + 1}`}
              onClick={() => setI(k)}
              className={cn("h-1.5 rounded-full transition-all", k === i ? "w-6 bg-primary" : "w-1.5 bg-gray-300")}
            />
          ))}
        </div>
        <button type="button" aria-label="Next review" className={nav} onClick={() => go(1)}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
