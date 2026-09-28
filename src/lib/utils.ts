import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Public marketing site. Sidebar links that live there (packages, consultation…). */
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://xplorevietnam.com";
export const siteLink = (path: string) => `${SITE_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;

export const SUPPORT_EMAIL = "hello@xplorevietnam.com";
