"use client";
import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { backend } from "@/lib/backend";
import { cn } from "@/lib/utils";
import { usePortal } from "@/components/portal-context";

import { GROUPS, TOTAL } from "@/lib/pre-arrival";

export default function ChecklistPage() {
  const { user } = usePortal();
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    backend.getChecklist(user.id).then((keys) => setDone(new Set(keys)));
  }, [user.id]);

  const toggle = (key: string) => {
    const next = new Set(done);
    const on = !next.has(key);
    if (on) next.add(key);
    else next.delete(key);
    setDone(next);
    backend.setChecklistItem(user.id, key, on);
  };

  const count = GROUPS.flatMap((g) => g.items).filter(([k]) => done.has(k)).length;

  return (
    <div className="-m-6 bg-[#EEF4FB] p-6">
      <div className="mx-auto max-w-[800px] space-y-4 py-10">
        <div>
          <h1 className="text-4xl font-bold text-brand-navy">Pre-Arrival Checklist</h1>
          <p className="mt-2 text-sm text-brand-ink2">
            This checklist addresses the little things that are often overlooked in the busy days leading up to your move.
          </p>
        </div>

        <div className="rounded-lg border bg-white px-3 py-3 shadow-sm">
          <div className="flex justify-between text-sm text-brand-navy">
            <span>Progress</span>
            <span>
              {count} of {TOTAL} completed
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-200">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(count / TOTAL) * 100}%` }} />
          </div>
        </div>

        {GROUPS.map((g, gi) => (
          <div key={g.title} className="rounded-lg border bg-white px-3 py-4 shadow-sm">
            <h2 className={cn("text-lg font-bold", gi % 2 === 1 ? "text-primary" : "text-[#D49A0B]")}>{g.title}</h2>
            <ul className="mt-2 space-y-1.5">
              {g.items.map(([key, text]) => {
                const on = done.has(key);
                return (
                  <li key={key} className="flex items-start gap-2 text-sm">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      aria-label={typeof text === "string" ? text : key}
                      onClick={() => toggle(key)}
                      className={cn(
                        "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border transition-colors",
                        on ? "border-primary bg-primary text-white" : "border-gray-600 hover:border-primary",
                      )}
                    >
                      {on && <Check className="h-3 w-3" strokeWidth={3} />}
                    </button>
                    <span className={cn("leading-5", on ? "text-gray-400 line-through" : "text-brand-navy")}>{text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
