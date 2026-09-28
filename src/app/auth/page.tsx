import { Suspense } from "react";
import AuthScreen from "./auth-screen";

export default function AuthPage() {
  return (
    <Suspense>
      <AuthScreen />
    </Suspense>
  );
}
