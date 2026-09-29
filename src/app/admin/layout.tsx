"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUpRight, ClipboardList, Inbox, LayoutDashboard, LogOut, Menu, ShieldAlert, ShoppingBag, Users, UsersRound, X, type LucideIcon } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { NavigatorLockup } from "@/components/brand";
import { AdminCtx, type AdminCtxValue } from "@/components/admin/ui";
import { admin } from "@/lib/admin";
import { backend } from "@/lib/backend";
import { cn } from "@/lib/utils";

const NAV: { icon: LucideIcon; label: string; href: string }[] = [
  { icon: LayoutDashboard, label: "Overview", href: "/admin" },
  { icon: Users, label: "Clients", href: "/admin/clients" },
  { icon: ClipboardList, label: "Requests", href: "/admin/requests" },
  { icon: Inbox, label: "Website leads", href: "/admin/leads" },
  { icon: ShoppingBag, label: "Website orders", href: "/admin/orders" },
  { icon: UsersRound, label: "Team", href: "/admin/team" },
];
const row = "flex h-10 w-full items-center rounded-md px-3 text-[14px] transition-colors";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const path = usePathname();
  const [state, setState] = useState<"checking" | "denied" | "ok">("checking");
  const [ctx, setCtx] = useState<AdminCtxValue | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth?next=" + encodeURIComponent(path));
      return;
    }
    let live = true;
    admin.isStaff(user.id).then(async (ok) => {
      if (!live) return;
      if (!ok) return setState("denied");
      const staff = await admin.listStaff();
      if (!live) return;
      setCtx({ user, staff });
      setState("ok");
    });
    return () => {
      live = false;
    };
    // path only matters for the first redirect
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, router]);

  const logout = async () => {
    await backend.signOut();
    router.replace("/auth");
  };

  if (state === "checking" || !user) {
    return <div className="flex h-screen items-center justify-center bg-brand-canvas text-sm text-gray-500">Checking access...</div>;
  }
  if (state === "denied") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-canvas p-6">
        <div className="max-w-sm rounded-xl bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-10 w-10 text-brand-red" />
          <h1 className="mt-4 text-xl font-bold text-brand-navy">Staff only</h1>
          <p className="mt-2 text-sm text-gray-600">
            {user.email} is not on the XploreVietnam team list, so the admin area is closed for this account.
          </p>
          <Link href="/vietnam" className="mt-6 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary/90">
            Go to Navigator
          </Link>
        </div>
      </div>
    );
  }

  const me = ctx!.staff.find((s) => s.user_id === user.id);
  return (
    <AdminCtx.Provider value={ctx}>
      <div className="flex h-screen bg-brand-canvas">
        {open && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-navy transition-transform duration-300 lg:static lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-16 flex-shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4">
            <NavigatorLockup />
            <button className="rounded-md p-2 text-white hover:bg-white/10 lg:hidden" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="px-6 pt-5">
            <span className="rounded bg-brand-red px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">Admin</span>
          </div>
          <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
            {NAV.map((it) => {
              const active = it.href === "/admin" ? path === "/admin" : path.startsWith(it.href);
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
                  className={cn(row, active ? "bg-white/10 font-medium text-white" : "text-white/70 hover:bg-white/5 hover:text-white")}
                >
                  <it.icon className="mr-3 h-[18px] w-[18px]" />
                  {it.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex-shrink-0 space-y-0.5 border-t border-white/10 px-3 py-4">
            <Link href="/vietnam" className={cn(row, "text-white/70 hover:bg-white/5 hover:text-white")}>
              <ArrowUpRight className="mr-3 h-[18px] w-[18px]" /> Open Navigator
            </Link>
            <button onClick={logout} className={cn(row, "text-white/70 hover:bg-white/5 hover:text-white")}>
              <LogOut className="mr-3 h-[18px] w-[18px]" /> Log out
            </button>
          </div>
        </aside>
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="flex h-16 flex-shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 sm:px-6">
            <button className="rounded-md p-2 text-brand-navy hover:bg-gray-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
            <div className="hidden text-sm text-gray-500 lg:block">XploreVietnam admin</div>
            <div className="text-right leading-tight">
              <p className="text-sm font-medium text-brand-navy">{me?.full_name || user.email}</p>
              <p className="text-xs text-gray-500">{me?.title || "Staff"}</p>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </AdminCtx.Provider>
  );
}
