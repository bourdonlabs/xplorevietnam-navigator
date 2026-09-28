"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Month grid in the shadcn/react-day-picker style used by StartAbroad. Value is yyyy-mm-dd. */
export function Calendar({ value, onSelect }: { value?: string | null; onSelect: (v: string) => void }) {
  const start = value ? new Date(value + "T00:00:00") : new Date();
  const [month, setMonth] = useState(new Date(start.getFullYear(), start.getMonth(), 1));
  const today = iso(new Date());

  const first = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
  const cells = Array.from({ length: 42 }, (_, i) => new Date(first.getFullYear(), first.getMonth(), first.getDate() + i));
  const weeks = cells[35].getMonth() !== month.getMonth() ? 5 : 6;
  const nav = "flex h-7 w-7 items-center justify-center rounded-md border border-input bg-transparent p-0 opacity-50 hover:opacity-100";

  return (
    <div className="p-3">
      <div className="relative flex items-center justify-center pt-1">
        <button type="button" aria-label="Previous month" className={cn(nav, "absolute left-1")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="text-sm font-medium">{month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}</div>
        <button type="button" aria-label="Next month" className={cn(nav, "absolute right-1")} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
      <table className="mt-4 w-full border-collapse">
        <thead>
          <tr className="flex">
            {DAYS.map((d) => (
              <th key={d} className="w-9 rounded-md text-[0.8rem] font-normal text-muted-foreground">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: weeks }, (_, w) => (
            <tr key={w} className="mt-2 flex w-full">
              {cells.slice(w * 7, w * 7 + 7).map((d) => {
                const v = iso(d);
                const outside = d.getMonth() !== month.getMonth();
                return (
                  <td key={v} className="h-9 w-9 p-0 text-center text-sm">
                    <button
                      type="button"
                      onClick={() => onSelect(v)}
                      className={cn(
                        "h-9 w-9 rounded-md p-0 font-normal hover:bg-accent",
                        outside && "text-muted-foreground opacity-50",
                        v === today && v !== value && "bg-accent text-accent-foreground",
                        v === value && "bg-primary text-primary-foreground hover:bg-primary",
                      )}
                    >
                      {d.getDate()}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
