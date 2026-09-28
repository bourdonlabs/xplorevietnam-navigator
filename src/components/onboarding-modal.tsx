"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/lib/backend";
import { COUNTRIES, MOVE_STAGES, SPONSOR_TYPES, VISA_TYPES } from "@/lib/journey";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";

const STEPS = 8;

type Form = {
  first_name: string;
  last_name: string;
  nationality: string;
  country_of_residence: string;
  move_stage: string;
  anticipated_move_date: string;
  visa_type: string;
  has_sponsor: boolean;
  sponsor_type: string;
};

const fromProfile = (p: Profile | null): Form => ({
  first_name: p?.first_name || "",
  last_name: p?.last_name || "",
  nationality: p?.nationality || "",
  country_of_residence: p?.country_of_residence || "",
  move_stage: p?.move_stage || "",
  anticipated_move_date: p?.anticipated_move_date || "",
  visa_type: p?.visa_type || "",
  has_sponsor: !!p?.has_sponsor,
  sponsor_type: p?.sponsor_type || "",
});

function Choice({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <div
      role="radio"
      aria-checked={selected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === " " || e.key === "Enter") && onClick()}
      className={cn(
        "cursor-pointer rounded-lg border-2 p-4 transition-colors",
        selected ? "border-brand-red bg-red-50" : "border-gray-200 hover:bg-gray-50",
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border-2",
            selected ? "border-brand-red" : "border-gray-300",
          )}
        >
          {selected && <div className="h-3 w-3 rounded-full bg-brand-red" />}
        </div>
        {children}
      </div>
    </div>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-3xl font-bold text-brand-navy">{children}</h2>
);

export function OnboardingModal({
  open,
  profile,
  onSave,
  onClose,
}: {
  open: boolean;
  profile: Profile | null;
  onSave: (patch: Partial<Profile>) => Promise<boolean>;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [f, setF] = useState<Form>(() => fromProfile(profile));
  const [saving, setSaving] = useState(false);

  const set = (patch: Partial<Form>) => setF((cur) => ({ ...cur, ...patch }));

  const valid = () => {
    switch (step) {
      case 0: return f.first_name.trim() !== "";
      case 1: return f.last_name.trim() !== "";
      case 2: return f.nationality !== "";
      case 3: return f.country_of_residence !== "";
      case 4: return f.move_stage !== "";
      case 5: return f.anticipated_move_date !== "";
      case 6: return f.visa_type !== "";
      case 7: return !f.has_sponsor || f.sponsor_type !== "";
      default: return false;
    }
  };

  const patch = (): Partial<Profile> => ({
    first_name: f.first_name.trim() || null,
    last_name: f.last_name.trim() || null,
    nationality: f.nationality || null,
    country_of_residence: f.country_of_residence || null,
    move_stage: f.move_stage || null,
    anticipated_move_date: f.anticipated_move_date || null,
    visa_type: f.visa_type || null,
    has_sponsor: f.has_sponsor,
    sponsor_type: f.has_sponsor ? f.sponsor_type || null : null,
  });

  const next = async () => {
    if (!valid()) return toast.error("Please complete this field");
    setSaving(true);
    // Answers are saved after every step, so nothing is lost if the window is closed.
    const last = step === STEPS - 1;
    const ok = await onSave(last ? { ...patch(), onboarded_at: new Date().toISOString() } : patch());
    setSaving(false);
    if (!ok) return;
    if (last) {
      toast.success("Profile completed successfully!");
      onClose();
    } else setStep(step + 1);
  };

  const onEnter = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && valid()) {
      e.preventDefault();
      next();
    }
  };

  const moved = f.move_stage === "moved";

  const body = () => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-4" onKeyDown={onEnter}>
            <H>What&apos;s your first name?</H>
            <Input value={f.first_name} onChange={(e) => set({ first_name: e.target.value })} placeholder="Enter your first name" className="p-6 text-lg md:text-lg" autoFocus />
          </div>
        );
      case 1:
        return (
          <div className="space-y-4" onKeyDown={onEnter}>
            <H>And your last name?</H>
            <Input value={f.last_name} onChange={(e) => set({ last_name: e.target.value })} placeholder="Enter your last name" className="p-6 text-lg md:text-lg" autoFocus />
          </div>
        );
      case 2:
      case 3: {
        const key = step === 2 ? "nationality" : "country_of_residence";
        return (
          <div className="space-y-4">
            <H>{step === 2 ? "What's your nationality?" : "Where do you currently live?"}</H>
            <Select
              value={f[key]}
              onChange={(e) => set({ [key]: e.target.value } as Partial<Form>)}
              className={cn("h-auto px-6 py-4 text-lg", !f[key] && "text-gray-500")}
            >
              <option value="" disabled>
                {step === 2 ? "Select your nationality" : "Select your country of residence"}
              </option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c} className="text-foreground">
                  {c}
                </option>
              ))}
            </Select>
          </div>
        );
      }
      case 4:
        return (
          <div className="space-y-4">
            <H>Where are you in your move to Vietnam?</H>
            <div className="space-y-3">
              {MOVE_STAGES.map((s) => (
                <Choice key={s.value} selected={f.move_stage === s.value} onClick={() => set({ move_stage: s.value })}>
                  <p className="text-lg font-medium text-brand-navy">{s.label}</p>
                </Choice>
              ))}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-4" onKeyDown={onEnter}>
            <H>{moved ? "When did you arrive in Vietnam?" : "When are you planning to move?"}</H>
            <Input type="date" value={f.anticipated_move_date} onChange={(e) => set({ anticipated_move_date: e.target.value })} className="p-6 text-lg md:text-lg" autoFocus />
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <H>Which visa are you applying for?</H>
            <p className="text-sm text-gray-500">You can change this later in your profile settings.</p>
            <div className="space-y-3">
              {VISA_TYPES.map((v) => (
                <Choice key={v.value} selected={f.visa_type === v.value} onClick={() => set({ visa_type: v.value })}>
                  <div>
                    <p className="text-lg font-semibold text-brand-navy">{v.label}</p>
                    <p className="text-sm text-gray-600">{v.sub}</p>
                  </div>
                </Choice>
              ))}
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-4">
            <H>Do you already have a sponsor in Vietnam?</H>
            <p className="text-sm text-gray-500">
              A sponsor is your Vietnamese employer, your own Vietnamese company, or your Vietnamese spouse or parent. You don&apos;t need one for an e-visa.
            </p>
            <div className="space-y-4">
              {[
                { yes: true, label: "Yes, I have a sponsor" },
                { yes: false, label: "No, not yet" },
              ].map((o) => (
                <div
                  key={o.label}
                  className="flex cursor-pointer items-center space-x-3 rounded-lg border p-4 hover:bg-gray-50"
                  onClick={() => set({ has_sponsor: o.yes, sponsor_type: o.yes ? f.sponsor_type : "" })}
                >
                  <Checkbox checked={f.has_sponsor === o.yes} onCheckedChange={() => set({ has_sponsor: o.yes })} />
                  <Label className="flex-1 cursor-pointer text-lg font-normal">{o.label}</Label>
                </div>
              ))}
            </div>
            {f.has_sponsor && (
              <div className="mt-4 space-y-2">
                <Label className="text-lg">Who is sponsoring you?</Label>
                <Select value={f.sponsor_type} onChange={(e) => set({ sponsor_type: e.target.value })} className={cn("h-auto px-6 py-4 text-lg", !f.sponsor_type && "text-gray-500")}>
                  <option value="" disabled>
                    Select your sponsor
                  </option>
                  {SPONSOR_TYPES.map((s) => (
                    <option key={s} value={s} className="text-foreground">
                      {s}
                    </option>
                  ))}
                </Select>
              </div>
            )}
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex min-h-[400px] flex-col sm:max-w-2xl" aria-describedby={undefined}>
        <DialogTitle className="sr-only">Set up your move profile</DialogTitle>
        <div className="mb-6 h-1 w-full rounded-full bg-gray-200">
          <div className="h-1 rounded-full bg-primary transition-all duration-300" style={{ width: `${((step + 1) / STEPS) * 100}%` }} />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xl">{body()}</div>
        </div>
        <div className="flex items-center justify-between border-t pt-6">
          <Button variant="ghost" onClick={() => step > 0 && setStep(step - 1)} disabled={step === 0 || saving} className="flex items-center gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="font-medium">{step + 1}</span>
            <span>/</span>
            <span>{STEPS}</span>
          </div>
          <Button onClick={next} disabled={!valid() || saving} className="flex items-center gap-2">
            {saving ? "Saving..." : step === STEPS - 1 ? "Complete" : (
              <>
                Next
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
