"use client";
import * as M from "@radix-ui/react-dropdown-menu";
import { ChevronDown, LogOut, User as UserIcon } from "lucide-react";
import Link from "next/link";
import type { Profile } from "@/lib/backend";
import { Avatar } from "@/components/avatar";

export function UserMenu({ profile, email, onLogout }: { profile: Profile | null; email: string; onLogout: () => void }) {
  return (
    <M.Root>
      <M.Trigger className="flex h-10 items-center gap-2 rounded-md px-4 py-2 hover:bg-gray-100 focus:outline-none">
        <Avatar profile={profile} email={email} className="h-8 w-8 text-sm" />
        <ChevronDown className="h-4 w-4 text-gray-600" />
      </M.Trigger>
      <M.Portal>
        <M.Content align="end" sideOffset={4} className="z-50 w-56 rounded-md border bg-white p-1 shadow-md">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium text-brand-navy">
              {profile?.first_name} {profile?.last_name}
            </p>
            <p className="text-xs text-gray-600">{email}</p>
          </div>
          <M.Separator className="-mx-1 my-1 h-px bg-gray-100" />
          <M.Item asChild>
            <Link href="/vietnam/profile" className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-gray-100 focus:bg-gray-100">
              <UserIcon className="mr-2 h-4 w-4" />
              Profile
            </Link>
          </M.Item>
          <M.Separator className="-mx-1 my-1 h-px bg-gray-100" />
          <M.Item
            onSelect={onLogout}
            className="flex cursor-pointer items-center rounded-sm px-2 py-1.5 text-sm text-red-600 outline-none hover:bg-gray-100 focus:bg-gray-100"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </M.Item>
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}
