"use client";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const read = () => {
  try {
    return window.localStorage.getItem("xv-consent") || "";
  } catch {
    return "";
  }
};
const subscribe = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};

// Consent banner (same pattern as the StartAbroad portal). Analytics only load after "Accept".
export function CookieBanner() {
  const saved = useSyncExternalStore(subscribe, read, () => "server");
  const [answered, setAnswered] = useState(false);
  const answer = (v: "accepted" | "declined") => {
    try {
      window.localStorage.setItem("xv-consent", v);
    } catch {}
    setAnswered(true);
  };
  if (saved || answered) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      <div className="mx-auto flex max-w-4xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] leading-relaxed text-gray-600">
          We use analytics to understand how the portal is used and improve it. Nothing is collected unless you accept.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => answer("declined")}>
            Decline
          </Button>
          <Button size="sm" onClick={() => answer("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
