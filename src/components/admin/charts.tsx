"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Single-series charts in one hue (brand royal blue), so no categorical palette is needed.
// Values and labels use text colours; the bar colour only carries magnitude.

/** Vertical bars over time, with a hover tooltip and recessive gridlines. */
export function TimeBars({ data, height = 180 }: { data: { key: string; label: string; value: number }[]; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const top = niceMax(max);
  const ticks = [0, top / 2, top];
  const every = Math.ceil(data.length / 6);
  const h = hover != null ? data[hover] : null;

  return (
    <div className="relative select-none pt-9">
      <div className="flex">
        <div className="relative mr-2 w-6 flex-shrink-0 text-right text-[11px] text-gray-400" style={{ height }}>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${100 - (t / top) * 100}%` }}>
              {t}
            </span>
          ))}
        </div>
        <div className="relative flex-1" style={{ height }} onMouseLeave={() => setHover(null)}>
          {ticks.map((t) => (
            <div key={t} className="absolute inset-x-0 border-t border-gray-100" style={{ top: `${100 - (t / top) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((d, i) => (
              <div
                key={d.key}
                className="flex h-full flex-1 cursor-default items-end"
                onMouseEnter={() => setHover(i)}
                onTouchStart={() => setHover(i)}
              >
                <div
                  className={cn("w-full rounded-t-[4px] transition-colors", hover === i ? "bg-brand-navy" : "bg-primary")}
                  style={{ height: d.value ? `${(d.value / top) * 100}%` : 0, minHeight: d.value ? 3 : 0 }}
                />
              </div>
            ))}
          </div>
          {h && hover != null && (
            <div
              className="pointer-events-none absolute -top-1 z-10 whitespace-nowrap rounded-md bg-brand-navy px-2.5 py-1.5 text-xs text-white shadow-lg"
              // keep the tooltip inside the chart near the edges
              style={{
                left: `${((hover + 0.5) / data.length) * 100}%`,
                transform: `translate(${hover < data.length * 0.15 ? "-12px" : hover > data.length * 0.85 ? "calc(-100% + 12px)" : "-50%"}, -100%)`,
              }}
            >
              <span className="font-semibold">{h.value}</span> sign-up{h.value === 1 ? "" : "s"} · {h.label}
            </div>
          )}
        </div>
      </div>
      <div className="ml-8 mt-2 flex h-4 text-[11px] text-gray-400">
        {data.map((d, i) => (
          <div key={d.key} className="relative flex-1">
            {i % every === 0 && <span className="absolute left-1/2 -translate-x-1/2 whitespace-nowrap">{d.label}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars for a breakdown (share of one total). */
export function BarList({ rows, total }: { rows: { label: string; value: number; href?: string }[]; total: number }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-4 text-center text-sm text-gray-500">No data yet</p>;
  return (
    <ul className="space-y-2.5">
      {rows.map((r) => (
        <li key={r.label} className="text-sm">
          <div className="flex items-baseline justify-between gap-3">
            <span className="truncate text-brand-navy">{r.label}</span>
            <span className="flex-shrink-0 tabular-nums text-gray-600">
              {r.value} <span className="text-gray-400">· {total ? Math.round((r.value / total) * 100) : 0}%</span>
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-gray-100">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function niceMax(n: number) {
  if (n <= 4) return 4;
  const step = Math.pow(10, Math.floor(Math.log10(n)));
  for (const m of [1, 2, 2.5, 5, 10]) if (m * step >= n) return Math.ceil((m * step) / 2) * 2;
  return n;
}
