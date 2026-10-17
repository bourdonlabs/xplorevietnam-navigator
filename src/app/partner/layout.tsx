"use client";
import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, LogOut } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/brand";
import { backend } from "@/lib/backend";

// Partner area: any signed-in account can open it (data is protected by row level security, not by this page).
export default function PartnerLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace("/auth?next=" + encodeURIComponent(path));
    // path only matters for the first redirect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router]);

  const logout = async () => {
    await backend.signOut();
    router.replace("/auth");
  };

  if (loading || !user) {
    return <div className="flex h-screen items-center justify-center bg-brand-canvas text-sm text-gray-500">Loading...</div>;
  }
  return (
    <div className="min-h-screen bg-brand-canvas">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Logo className="h-9" />
            <span className="hidden rounded bg-brand-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-primary sm:inline">Partner</span>
          </div>
          <div className="flex items-center gap-1 text-sm">
            <span className="mr-2 hidden max-w-[220px] truncate text-gray-500 md:inline">{user.email}</span>
            <Link href="/vietnam" className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-brand-navy hover:bg-gray-100">
              Navigator <ArrowUpRight className="h-4 w-4" />
            </Link>
            <button onClick={logout} className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-brand-navy hover:bg-gray-100">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6 lg:py-8">{children}</main>
    </div>
  );
}
