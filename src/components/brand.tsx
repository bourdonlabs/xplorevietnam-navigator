import { cn } from "@/lib/utils";

/** Vietnam flag as SVG: emoji flags render as the letters "VN" on Windows. */
export function VnFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 20" className={cn("rounded-[3px]", className)} aria-label="Vietnam">
      <rect width="30" height="20" fill="#DA251D" />
      <polygon
        fill="#FFFF00"
        points="15.00,4.00 16.35,8.15 20.71,8.15 17.18,10.71 18.53,14.85 15.00,12.29 11.47,14.85 12.82,10.71 9.29,8.15 13.65,8.15"
      />
    </svg>
  );
}

/** Sidebar lockup: skyline badge + wordmark + italic "Navigator" (as in the Navigator mockup). */
export function NavigatorLockup({ className }: { className?: string }) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2 whitespace-nowrap", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo-light-icon.png" alt="" className="h-8 w-auto flex-shrink-0" />
      <span className="text-white text-base font-bold leading-7 tracking-tight">XploreVietnam</span>
      <span className="italic text-white text-base leading-7">Navigator</span>
    </div>
  );
}

export function Logo({ light, className }: { light?: boolean; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={light ? "/logo-light.png" : "/logo.png"} alt="XploreVietnam" className={cn("w-auto", className)} />
  );
}
