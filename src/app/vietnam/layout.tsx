"use client";
import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import { toast } from "sonner";
import { backend, type Profile } from "@/lib/backend";
import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/brand";
import { OnboardingModal } from "@/components/onboarding-modal";
import { PortalCtx } from "@/components/portal-context";
import { Sidebar } from "@/components/sidebar";
import { UserMenu } from "@/components/user-menu";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [onboarding, setOnboarding] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/auth");
      return;
    }
    backend.getProfile(user.id).then((p) => {
      setProfile(p);
      setReady(true);
      if (!p?.onboarded_at) setOnboarding(true);
    });
  }, [user, loading, router]);

  const saveProfile = useCallback(
    async (patch: Partial<Profile>) => {
      if (!user) return false;
      const res = await backend.saveProfile(user.id, patch);
      if (res.error) {
        toast.error("Failed to save profile: " + res.error);
        return false;
      }
      setProfile((cur) => ({
        ...(cur || ({ user_id: user.id } as Profile)),
        ...patch,
      }));
      return true;
    },
    [user],
  );

  const logout = async () => {
    await backend.signOut();
    router.replace("/auth");
  };

  if (!user || !ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-canvas text-sm text-gray-500">
        Loading your portal...
      </div>
    );
  }

  // Profile Settings is a full page of its own (no sidebar or header), like the original.
  const bare = pathname === "/vietnam/profile";

  return (
    <PortalCtx.Provider
      value={{
        user,
        profile,
        saveProfile,
        openOnboarding: () => setOnboarding(true),
      }}
    >
      {bare ? (
        children
      ) : (
        <div className="flex h-screen bg-brand-canvas">
          <Sidebar
            open={menuOpen}
            onClose={() => setMenuOpen(false)}
            onLogout={logout}
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <header className="flex h-16 items-center justify-between border-b border-gray-100 bg-white px-6 shadow-sm">
              <div className="flex items-center">
                <button
                  className="mr-4 rounded-md px-3 py-1 text-brand-navy hover:bg-gray-100 lg:hidden"
                  onClick={() => setMenuOpen(true)}
                  aria-label="Open menu"
                >
                  <Menu className="h-8 w-8" />
                </button>
              </div>
              <UserMenu
                profile={profile}
                email={user.email}
                onLogout={logout}
              />
            </header>
            <main className="flex-1 overflow-y-auto p-6">
              <div className="mx-auto max-w-7xl space-y-6">{children}</div>
              <footer className="mt-8 border-t border-gray-200 bg-white py-6">
                <div className="flex justify-center">
                  <Logo className="h-10" />
                </div>
              </footer>
            </main>
          </div>
        </div>
      )}
      {/* keyed so the form starts fresh from the saved profile each time it opens */}
      <OnboardingModal
        key={String(onboarding)}
        open={onboarding}
        profile={profile}
        onSave={saveProfile}
        onClose={() => setOnboarding(false)}
      />
    </PortalCtx.Provider>
  );
}
