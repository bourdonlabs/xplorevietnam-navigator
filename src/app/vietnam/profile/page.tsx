"use client";
import { useState } from "react";
import { toast } from "sonner";
import { usePortal } from "@/components/portal-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { COUNTRIES, MOVE_STAGES, SPONSOR_TYPES, VISA_TYPES } from "@/lib/journey";

export default function ProfilePage() {
  const { user, profile, saveProfile } = usePortal();
  const [f, setF] = useState({
    first_name: profile?.first_name || "",
    last_name: profile?.last_name || "",
    nationality: profile?.nationality || "",
    country_of_residence: profile?.country_of_residence || "",
    move_stage: profile?.move_stage || "",
    anticipated_move_date: profile?.anticipated_move_date || "",
    visa_type: profile?.visa_type || "",
    sponsor_type: profile?.sponsor_type || "",
  });
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((cur) => ({ ...cur, [k]: e.target.value }));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await saveProfile({
      ...Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v || null])),
      has_sponsor: !!f.sponsor_type,
    });
    setBusy(false);
    if (ok) toast.success("Profile saved");
  };

  const field = "space-y-2";
  return (
    <>
      <div className="space-y-3">
        <h1 className="text-4xl font-bold text-brand-navy">Your Profile</h1>
        <p className="text-lg text-brand-navy">Your journey dates and checklists follow these answers.</p>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <form onSubmit={save} className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className={field}>
              <Label htmlFor="fn">First name</Label>
              <Input id="fn" value={f.first_name} onChange={set("first_name")} required />
            </div>
            <div className={field}>
              <Label htmlFor="ln">Last name</Label>
              <Input id="ln" value={f.last_name} onChange={set("last_name")} required />
            </div>
            <div className={field}>
              <Label htmlFor="em">Email</Label>
              <Input id="em" value={user.email} disabled />
            </div>
            <div className={field}>
              <Label htmlFor="nat">Nationality</Label>
              <Select id="nat" value={f.nationality} onChange={set("nationality")}>
                <option value="">Select</option>
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <div className={field}>
              <Label htmlFor="res">Country of residence</Label>
              <Select id="res" value={f.country_of_residence} onChange={set("country_of_residence")}>
                <option value="">Select</option>
                {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
              </Select>
            </div>
            <div className={field}>
              <Label htmlFor="stage">Where are you in your move?</Label>
              <Select id="stage" value={f.move_stage} onChange={set("move_stage")}>
                <option value="">Select</option>
                {MOVE_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
            </div>
            <div className={field}>
              <Label htmlFor="date">{f.move_stage === "moved" ? "Arrival date" : "Planned move date"}</Label>
              <Input id="date" type="date" value={f.anticipated_move_date} onChange={set("anticipated_move_date")} />
            </div>
            <div className={field}>
              <Label htmlFor="visa">Visa</Label>
              <Select id="visa" value={f.visa_type} onChange={set("visa_type")}>
                <option value="">Select</option>
                {VISA_TYPES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
              </Select>
            </div>
            <div className={field}>
              <Label htmlFor="sp">Sponsor in Vietnam</Label>
              <Select id="sp" value={f.sponsor_type} onChange={set("sponsor_type")}>
                <option value="">None yet</option>
                {SPONSOR_TYPES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" disabled={busy} className="h-11 px-8">
                {busy ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </>
  );
}
