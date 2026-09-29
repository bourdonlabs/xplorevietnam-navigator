"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import { toast } from "sonner";
import { usePortal } from "@/components/portal-context";
import { Input, Select } from "@/components/ui/input";
import { COUNTRIES, MOVE_STAGES, SPONSOR_TYPES, VISA_TYPES } from "@/lib/journey";
import { CITIES } from "@/lib/visa-docs";
import { cn } from "@/lib/utils";

// Full-page profile form (no sidebar), opened from the avatar menu. Same fields as onboarding, so a client
// can correct any answer later; the journey dates and visa checklist follow what is saved here.
const label = "mb-2 block text-sm text-brand-navy";
const box = "h-9 text-sm";

export default function ProfilePage() {
  const router = useRouter();
  const { profile, saveProfile } = usePortal();
  const [f, setF] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    nationality: profile?.nationality || "",
    country_of_residence: profile?.country_of_residence || "",
    destination_city: profile?.destination_city || "",
    move_stage: profile?.move_stage || "",
    anticipated_move_date: profile?.anticipated_move_date || "",
    visa_type: profile?.visa_type || "",
    has_sponsor: !!profile?.has_sponsor,
    sponsor_type: profile?.sponsor_type || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((cur) => ({ ...cur, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { has_sponsor, sponsor_type, ...rest } = f;
    const ok = await saveProfile({
      ...Object.fromEntries(Object.entries(rest).map(([k, v]) => [k, v.trim() || null])),
      has_sponsor,
      sponsor_type: has_sponsor ? sponsor_type : null,
    });
    setBusy(false);
    if (ok) toast.success("Profile updated");
  };

  return (
    <div className="min-h-screen bg-[#EEF4FB] px-4 pb-16 pt-8 sm:pt-10">
      <div className="mx-auto max-w-[648px]">
        <Link href="/vietnam" className="ml-3 inline-flex items-center gap-3 text-sm text-brand-navy hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Back to Dashboard
        </Link>

        <form onSubmit={save} className="mt-10 rounded-xl bg-white p-5 shadow-sm sm:p-6">
          <h1 className="text-2xl font-bold text-brand-navy">Profile Settings</h1>
          <p className="mt-2 text-sm text-brand-navy">Update your onboarding information and personal details</p>

          <div className="mt-8 space-y-5">
            <div>
              <span className={label}>Destination Country</span>
              <div className="flex h-11 items-center justify-between rounded-md border border-gray-200 bg-gray-50 px-3">
                <span className="text-base text-gray-600">Vietnam</span>
                <span className="text-[11px] text-gray-400">Cannot be changed</span>
              </div>
            </div>

            <div>
              <label htmlFor="city" className={label}>Destination City</label>
              <Select id="city" value={f.destination_city} onChange={set("destination_city")} className={box}>
                <option value="">Select a city</option>
                {CITIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
              <div>
                <label htmlFor="fn" className={label}>First Name</label>
                <Input id="fn" value={f.first_name} onChange={set("first_name")} required className={box} />
              </div>
              <div>
                <label htmlFor="ln" className={label}>Last Name</label>
                <Input id="ln" value={f.last_name} onChange={set("last_name")} required className={box} />
              </div>
            </div>

            <div>
              <label htmlFor="nat" className={label}>Nationality</label>
              <Select id="nat" value={f.nationality} onChange={set("nationality")} className={box}>
                <option value="">Select your nationality</option>
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </div>

            <div>
              <label htmlFor="res" className={label}>Country of Residence</label>
              <Select id="res" value={f.country_of_residence} onChange={set("country_of_residence")} className={box}>
                <option value="">Select your country of residence</option>
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </div>

            <div>
              <label htmlFor="stage" className={label}>Where are you in your move?</label>
              <Select id="stage" value={f.move_stage} onChange={set("move_stage")} className={box}>
                <option value="">Select</option>
                {MOVE_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>

            <div>
              <label htmlFor="date" className={label}>{f.move_stage === "moved" ? "Arrival Date" : "Anticipated Move Date"}</label>
              <Input id="date" type="date" value={f.anticipated_move_date} onChange={set("anticipated_move_date")} className={box} />
            </div>

            <div>
              <label htmlFor="visa" className={label}>Visa Type</label>
              <Select id="visa" value={f.visa_type} onChange={set("visa_type")} className={box}>
                <option value="">Select a visa type</option>
                {VISA_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </Select>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={f.has_sponsor}
                onClick={() => setF((cur) => ({ ...cur, has_sponsor: !cur.has_sponsor }))}
                className="flex items-center gap-2 text-sm text-brand-navy"
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border transition-colors",
                    f.has_sponsor ? "border-primary bg-primary text-white" : "border-primary",
                  )}
                >
                  {f.has_sponsor && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                I have a sponsor in Vietnam
              </button>
              {f.has_sponsor && (
                <div>
                  <label htmlFor="sp" className={label}>Who is sponsoring you?</label>
                  <Select id="sp" value={f.sponsor_type} onChange={set("sponsor_type")} required className={box}>
                    <option value="">Select your sponsor</option>
                    {SPONSOR_TYPES.map((s) => <option key={s}>{s}</option>)}
                  </Select>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8 flex gap-3">
            <button
              type="submit"
              disabled={busy}
              className="h-9 flex-1 rounded-md bg-primary text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/vietnam")}
              className="h-9 rounded-md border border-gray-200 bg-white px-4 text-sm text-brand-navy transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
