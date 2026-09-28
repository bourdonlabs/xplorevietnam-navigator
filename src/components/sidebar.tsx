"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen, Building2, Calculator, CreditCard, FileText, GraduationCap, Handshake, House, ListChecks, LogOut,
  Package, Phone, Search, X, type LucideIcon,
} from "lucide-react";
import { NavigatorLockup } from "@/components/brand";
import { cn } from "@/lib/utils";

type Item = { icon: LucideIcon; label: string; href: string };

export const NAV: { heading: string | null; items: Item[] }[] = [
  { heading: null, items: [{ icon: House, label: "Home", href: "/vietnam" }] },
  {
    heading: "Start Your Journey",
    items: [
      { icon: CreditCard, label: "Visa", href: "/vietnam/visa" },
      { icon: FileText, label: "Tax Code", href: "/vietnam/tax-code" },
      { icon: Building2, label: "Bank Account", href: "/vietnam/bank-account" },
    ],
  },
  {
    heading: "Work With Us",
    items: [
      { icon: Package, label: "Relocation Packages", href: "/vietnam/relocation-packages" },
      { icon: Search, label: "Rental Search", href: "/vietnam/rental-search" },
      { icon: Phone, label: "Free Consultation", href: "/vietnam/consultation" },
    ],
  },
  {
    heading: "Resources",
    items: [
      { icon: Calculator, label: "Cost of Living", href: "/vietnam/cost-of-living" },
      { icon: ListChecks, label: "Pre-Arrival Checklist", href: "/vietnam/checklist" },
      { icon: GraduationCap, label: "Schools", href: "/vietnam/schools" },
      { icon: Handshake, label: "Partners", href: "/vietnam/partners" },
      { icon: BookOpen, label: "Guides", href: "/vietnam/guides" },
    ],
  },
];

const row = "w-full flex items-center h-10 px-3 rounded-md text-[14px] transition-colors";

export function Sidebar({ open, onClose, onLogout }: { open: boolean; onClose: () => void; onLogout: () => void }) {
  const path = usePathname();
  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={onClose} />}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[288px] transform lg:w-64 flex-col bg-brand-navy shadow-lg transition-transform duration-300 ease-in-out lg:static lg:inset-0 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-16 flex-shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4">
          <NavigatorLockup />
          <button className="flex-shrink-0 rounded-md p-2 text-white hover:bg-white/10 lg:hidden" onClick={onClose} aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {NAV.map((group, gi) => (
            <div key={gi}>
              {group.heading && (
                <div className="mb-2 mt-6 px-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-white/40">{group.heading}</span>
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map((it) => {
                  const active = it.href === "/vietnam" ? path === "/vietnam" : path.startsWith(it.href);
                  return (
                    <Link
                      key={it.href}
                      href={it.href}
                      onClick={onClose}
                      className={cn(row, active ? "bg-brand-red text-white" : "text-white/75 hover:bg-white/10 hover:text-white")}
                    >
                      <it.icon className="mr-3 h-[18px] w-[18px] flex-shrink-0" />
                      <span className="flex-1 text-left">{it.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="flex-shrink-0 border-t border-white/10 px-3 py-4">
          <button onClick={onLogout} className={cn(row, "text-white/75 hover:bg-white/10 hover:text-white")}>
            <LogOut className="mr-3 h-[18px] w-[18px]" />
            <span className="flex-1 text-left">Log out</span>
          </button>
        </div>
      </div>
    </>
  );
}
