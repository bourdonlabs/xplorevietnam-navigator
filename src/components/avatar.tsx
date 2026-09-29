"use client";
import type { Profile } from "@/lib/backend";
import { useAvatarUrl } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export function Avatar({ profile, email, className }: { profile: Profile | null; email?: string; className?: string }) {
  const url = useAvatarUrl(profile?.avatar_path);
  const initials = `${profile?.first_name?.[0] || ""}${profile?.last_name?.[0] || ""}`.toUpperCase() || email?.[0]?.toUpperCase() || "";
  return (
    <span className={cn("flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-sky font-medium text-brand-navy", className)}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
