"use client";
import { createContext, useContext } from "react";
import type { Profile, User } from "@/lib/backend";

export type PortalState = {
  user: User;
  profile: Profile | null;
  saveProfile: (patch: Partial<Profile>) => Promise<boolean>;
  openOnboarding: () => void;
};

export const PortalCtx = createContext<PortalState | null>(null);

export function usePortal() {
  const ctx = useContext(PortalCtx);
  if (!ctx) throw new Error("usePortal outside portal layout");
  return ctx;
}
