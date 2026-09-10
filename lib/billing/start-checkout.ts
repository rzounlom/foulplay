import type { BillingPlanId } from "@/lib/billing/plans";
import type { PaywallTrigger } from "@/lib/billing/hosting-limits";

export type StartCheckoutInput = {
  plan: BillingPlanId;
  trigger: PaywallTrigger;
  returnPath?: string;
};

export async function startCheckout(
  input: StartCheckoutInput,
): Promise<{ url: string }> {
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = (await res.json()) as { url?: string; error?: string };
  if (!res.ok || !data.url) {
    throw new Error(data.error ?? "Could not start checkout");
  }
  return { url: data.url };
}

export async function redirectToCheckout(
  input: StartCheckoutInput,
): Promise<void> {
  const { url } = await startCheckout(input);
  window.location.href = url;
}
