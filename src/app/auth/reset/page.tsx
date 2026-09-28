"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { backend } from "@/lib/backend";
import { supabaseBrowser } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

// Landing page of the password-reset email (the callback route has already signed the user in).
export default function ResetPassword() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (backend.demo) return router.replace("/vietnam");
    setBusy(true);
    const { error } = await supabaseBrowser().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    router.replace("/vietnam");
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-white p-6">
      <form onSubmit={save} className="w-full max-w-md space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-brand-navy">Choose a new password</h1>
          <p className="text-sm text-gray-500">At least 8 characters</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw">New password</Label>
          <Input id="pw" type="password" minLength={8} required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={busy}>
          {busy ? "Saving..." : "Save password"}
        </Button>
      </form>
    </main>
  );
}
