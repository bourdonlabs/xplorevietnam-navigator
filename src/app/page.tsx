"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/components/auth-provider";
import { buttonClass } from "@/components/ui/button";
import { CookieBanner } from "@/components/cookie-banner";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && user) router.replace("/vietnam");
  }, [user, loading, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="mb-4 text-4xl font-bold text-brand-navy">Welcome to XploreVietnam</h1>
      <p className="mb-6 text-xl text-gray-600">Sign in to access your personalized relocation dashboard.</p>
      <Link href="/auth" className={buttonClass()}>
        Log in / Sign up
      </Link>
      <CookieBanner />
    </main>
  );
}
