"use client";
import { toast } from "sonner";
import { backend } from "./backend";
import { priceUsd, type ServiceKey } from "./services";

/**
 * Pay for a service. With Stripe on: redirects to Stripe Checkout.
 * With Stripe off (or demo mode): records a request the team follows up by email.
 * Returns true when a request was recorded here (no redirect).
 */
export async function startCheckout(userId: string, service: ServiceKey, quantity = 1, dependents = 0): Promise<boolean> {
  try {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ service, quantity, dependents }),
    });
    if (res.ok) {
      const { url } = (await res.json()) as { url?: string; fallback?: boolean };
      if (url) {
        window.location.href = url;
        return false;
      }
    } else {
      const { error } = await res.json().catch(() => ({ error: "checkout_failed" }));
      toast.error(error === "not_signed_in" ? "Please log in again." : "Couldn't start checkout. Please try again.");
      return false;
    }
  } catch {
    /* network error: fall through to a request */
  }
  const r = await backend.createRequest(userId, service, dependents, priceUsd(service, quantity, dependents), quantity);
  if (r.error) {
    toast.error(r.error);
    return false;
  }
  toast.success("Request received. We'll be in touch by email to confirm and arrange payment.");
  return true;
}

/** Call once on a service page: shows the result of a Stripe redirect and cleans the URL. */
export function readCheckoutReturn(): "success" | "cancelled" | null {
  if (typeof window === "undefined") return null;
  const url = new URL(window.location.href);
  const v = url.searchParams.get("checkout");
  if (!v) return null;
  url.searchParams.delete("checkout");
  window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  if (v === "success") toast.success("Payment received — thank you! We'll email you the next steps.");
  if (v === "cancelled") toast("Checkout cancelled. You haven't been charged.");
  return v === "success" ? "success" : "cancelled";
}
