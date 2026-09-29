"use client";
import { useState } from "react";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import { usePortal } from "@/components/portal-context";
import { buttonClass } from "@/components/ui/button";
import { siteLink } from "@/lib/utils";

// Booking page URL from Cal.com or Calendly, e.g. https://cal.com/xplorevietnam/consultation
// Both accept ?name=&email= to prefill the form, so clients don't retype what Navigator already knows.
const BOOKING_URL = process.env.NEXT_PUBLIC_BOOKING_URL || "";

export default function ConsultationPage() {
  const { user, profile } = usePortal();
  const [loaded, setLoaded] = useState(false);

  const src = (() => {
    if (!BOOKING_URL) return "";
    const u = new URL(BOOKING_URL);
    const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ");
    if (name) u.searchParams.set("name", name);
    if (user.email) u.searchParams.set("email", user.email);
    if (u.hostname.endsWith("cal.com")) u.searchParams.set("embed", "true");
    if (u.hostname.endsWith("calendly.com")) u.searchParams.set("embed_type", "Inline");
    return u.toString();
  })();

  return (
    <div className="mx-auto max-w-6xl">
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-brand-navy">Book Your Free Consultation</h1>
        <p className="mt-1 text-sm text-gray-700">
          Schedule a free, no-obligation consultation with an XploreVietnam relocation specialist using the calendar below.
        </p>
        <div className="relative mt-6 overflow-hidden rounded-lg border bg-gray-50" style={{ minHeight: 700 }}>
          {src ? (
            <>
              {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-gray-500">Loading calendar...</div>
              )}
              <iframe
                src={src}
                title="Book Your Free Consultation"
                onLoad={() => setLoaded(true)}
                className="relative block w-full border-0"
                style={{ height: 700 }}
              />
            </>
          ) : (
            <div className="flex h-[700px] flex-col items-center justify-center gap-4 p-6 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint">
                <CalendarDays className="h-5 w-5 text-primary" />
              </span>
              <p className="max-w-sm text-gray-600">The booking calendar is being connected.</p>
              <a href={siteLink("get-started.html")} target="_blank" rel="noopener" className={buttonClass("outline")}>
                Book on our website <ArrowUpRight />
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
