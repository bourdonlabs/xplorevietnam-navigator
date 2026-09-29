"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { backend } from "@/lib/backend";
import { useAuth } from "@/components/auth-provider";
import { Logo, VnFlag } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type View = "form" | "check-email" | "forgot" | "reset-sent";

export default function AuthScreen() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading } = useAuth();
  const [tab, setTab] = useState(params.get("tab") === "signup" ? "signup" : "login");
  const [view, setView] = useState<View>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  // Where to go after login: ?next=/admin etc. Only same-site paths are accepted.
  const nextParam = params.get("next");
  const dest = nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/vietnam";

  useEffect(() => {
    if (!loading && user) router.replace(dest);
  }, [user, loading, router, dest]);

  useEffect(() => {
    if (params.get("error") === "link") toast.error("That link has expired or was already used. Log in or request a new one.");
  }, [params]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = tab === "login" ? await backend.signIn(email, password) : await backend.signUp(email, password);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    if (tab === "signup") setView("check-email");
    else router.replace(dest);
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await backend.sendReset(email);
    setBusy(false);
    if (res.error) return toast.error(res.error);
    setView("reset-sent");
  };

  if (view === "check-email" || view === "reset-sent") {
    const signup = view === "check-email";
    return (
      <main className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="w-full max-w-md rounded-lg border bg-white p-6 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-tint">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-brand-navy">Check your email</h1>
          <p className="mt-1 text-sm text-gray-600">
            {signup ? "We've sent a confirmation link to" : "We've sent a password reset link to"}
          </p>
          <p className="mt-1 font-medium text-brand-navy">{email}</p>
          <p className="mt-5 text-sm text-gray-600">
            {signup
              ? "Click the link in the email to verify your account and get started with XploreVietnam."
              : "Click the link in the email to choose a new password."}
          </p>
          <p className="mt-4 text-sm text-gray-600">
            Didn&apos;t receive the email? Check your spam folder or
            <br />
            <button
              className="text-primary hover:underline"
              onClick={() => {
                setView(signup ? "form" : "forgot");
                if (signup) setTab("signup");
              }}
            >
              {signup ? "try signing up again" : "send it again"}
            </button>
          </p>
          <div className="mt-4 border-t pt-4">
            <p className="text-sm text-gray-600">{signup ? "Already verified?" : "Remembered it?"}</p>
            <Button
              variant="outline"
              className="mt-3 w-full"
              onClick={() => {
                setView("form");
                setTab("login");
              }}
            >
              Back to login
            </Button>
            {backend.demo && signup && (
              <p className="mt-3 text-xs text-gray-400">Demo mode: no email is sent. Log in with any password.</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen">
      <div className="relative hidden flex-col items-center justify-center overflow-hidden bg-brand-navy p-12 lg:flex lg:w-[45%]">
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.8) 1px, transparent 0px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="relative z-10 max-w-sm space-y-8 text-center">
          <Logo light className="mx-auto h-20" />
          <div className="space-y-3">
            <h2 className="text-3xl font-bold leading-tight text-white">Your relocation journey starts here.</h2>
            <p className="text-base leading-relaxed text-white/65">
              Navigate every step of your move to Vietnam with a personalized guide built for you.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white/85">
              <VnFlag className="h-3 w-[18px]" /> Vietnam
            </span>
          </div>
        </div>
        <p className="absolute bottom-8 text-xs text-white/30">150+ clients relocated</p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-white p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="flex justify-center lg:hidden">
            <Logo className="h-12" />
          </div>
          {view === "forgot" ? (
            <form className="space-y-6" onSubmit={sendReset}>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-brand-navy">Reset your password</h1>
                <p className="text-sm text-gray-500">Enter your email and we&apos;ll send you a reset link</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-email">Email</Label>
                <Input id="reset-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <Button type="submit" className="h-11 w-full" disabled={busy}>
                {busy ? "Sending..." : "Send reset link"}
              </Button>
              <button type="button" className="w-full text-center text-sm text-gray-500 hover:text-brand-navy" onClick={() => setView("form")}>
                Back to login
              </button>
            </form>
          ) : (
            <>
              <div className="space-y-1">
                <h1 className="text-2xl font-bold text-brand-navy">Welcome back</h1>
                <p className="text-sm text-gray-500">Sign in or create an account to continue</p>
              </div>
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Log in</TabsTrigger>
                  <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>
                {(["login", "signup"] as const).map((t) => (
                  <TabsContent key={t} value={t} className="mt-5">
                    <form className="space-y-4" onSubmit={submit}>
                      <div className="space-y-2">
                        <Label htmlFor={`${t}-email`}>Email</Label>
                        <Input id={`${t}-email`} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor={`${t}-password`}>Password</Label>
                        <Input
                          id={`${t}-password`}
                          type="password"
                          required
                          minLength={t === "signup" ? 8 : undefined}
                          autoComplete={t === "login" ? "current-password" : "new-password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </div>
                      {t === "login" && (
                        <div className="flex justify-end">
                          <button type="button" className="text-xs text-gray-500 hover:text-brand-navy" onClick={() => setView("forgot")}>
                            Forgot password?
                          </button>
                        </div>
                      )}
                      <Button type="submit" className="h-11 w-full" disabled={busy}>
                        {busy ? "Please wait..." : t === "login" ? "Log in" : "Create account"}
                      </Button>
                    </form>
                  </TabsContent>
                ))}
              </Tabs>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
