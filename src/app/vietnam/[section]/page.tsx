"use client";
import { notFound, useParams } from "next/navigation";
import { ArrowUpRight, Clock } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { siteLink } from "@/lib/utils";

// Sections not built yet. Visa, Tax Code, Bank Account, Relocation Packages, Rental Search, Free Consultation, Cost of Living, Pre-Arrival Checklist, Schools and Profile have their own pages.
type Page = { title: string; intro: string; soon: string; site?: { label: string; path: string } };
const PAGES: Record<string, Page> = {
  partners: { title: "Partners", intro: "Our vetted network of local experts.", soon: "The partner list is coming to Navigator." },
  guides: {
    title: "Expert Guides",
    intro: "Expert-written guides to help you avoid common mistakes, save time, and move with confidence.",
    soon: "Downloadable guides are coming to Navigator.",
    site: { label: "Browse our Vietnam guides", path: "guide.html" },
  },
};

export default function SectionPage() {
  const { section } = useParams<{ section: string }>();
  const page = PAGES[section];
  if (!page) notFound();

  return (
    <>
      <div className="space-y-3">
        <h1 className="text-left text-4xl font-bold text-brand-navy">{page.title}</h1>
        <p className="max-w-3xl text-left text-lg leading-relaxed text-brand-navy">{page.intro}</p>
      </div>
      <Card className="border-0 shadow-sm">
        <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <p className="text-gray-600">{page.soon}</p>
          {page.site && (
            <a href={siteLink(page.site.path)} target="_blank" rel="noopener" className={buttonClass("outline")}>
              {page.site.label} <ArrowUpRight />
            </a>
          )}
        </CardContent>
      </Card>
    </>
  );
}
