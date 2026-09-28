"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { backend, type User } from "@/lib/backend";

type Ctx = { user: User | null; loading: boolean };
const AuthCtx = createContext<Ctx>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<Ctx>({ user: null, loading: true });
  useEffect(() => {
    let alive = true;
    backend.getUser().then((user) => alive && setState({ user, loading: false }));
    const off = backend.onAuthChange((user) => setState({ user, loading: false }));
    return () => {
      alive = false;
      off();
    };
  }, []);
  return <AuthCtx.Provider value={state}>{children}</AuthCtx.Provider>;
}

export const useAuth = () => useContext(AuthCtx);
