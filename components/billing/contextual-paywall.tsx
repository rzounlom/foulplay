"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { BILLING_CATALOG } from "@/lib/billing/plans";
import type { BillingPlanId } from "@/lib/billing/plans";
import type { PaywallTrigger } from "@/lib/billing/hosting-limits";
import { getContextualPaywallCopy } from "@/lib/billing/paywall-copy";
import { redirectToCheckout } from "@/lib/billing/start-checkout";
import Link from "next/link";

type ContextualPaywallProps = {
  trigger: PaywallTrigger;
  returnPath: string;
  onDismiss?: () => void;
  /** Inline card (lobby/create) vs modal overlay */
  variant?: "card" | "modal";
};

export function ContextualPaywall({
  trigger,
  returnPath,
  onDismiss,
  variant = "card",
}: ContextualPaywallProps) {
  const copy = getContextualPaywallCopy(trigger);
  const [loadingPlan, setLoadingPlan] = useState<BillingPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "paywall_viewed",
        props: { trigger },
      }),
      credentials: "include",
    }).catch(() => {});
  }, [trigger]);

  const checkout = useCallback(
    async (plan: BillingPlanId) => {
      setLoadingPlan(plan);
      setError(null);
      try {
        await redirectToCheckout({ plan, trigger, returnPath });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start checkout");
        setLoadingPlan(null);
      }
    },
    [returnPath, trigger],
  );

  const inner = (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground" data-testid="paywall-title">
          {copy.title}
        </h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          {copy.body}
        </p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          {copy.footnote}
        </p>
      </div>
      <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
        Only the host upgrades. Everyone else plays free.
      </p>
      <div className="flex flex-col gap-2">
        <Button
          variant="primary"
          size="md"
          fullWidth
          data-testid="paywall-game-night"
          isLoading={loadingPlan === "game_night"}
          disabled={loadingPlan !== null}
          onClick={() => void checkout("game_night")}
        >
          Unlock Game Night — {BILLING_CATALOG.game_night.displayPrice}
        </Button>
        <Button
          variant="secondary"
          size="md"
          fullWidth
          data-testid="paywall-monthly"
          isLoading={loadingPlan === "monthly"}
          disabled={loadingPlan !== null}
          onClick={() => void checkout("monthly")}
        >
          Get FoulPlay+ — {BILLING_CATALOG.monthly.displayPrice}/mo
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
      <p className="text-center text-xs text-neutral-500">
        <Link href="/upgrade" className="text-primary hover:underline">
          See all plans
        </Link>
      </p>
      {onDismiss ? (
        <button
          type="button"
          className="w-full text-xs text-neutral-500 hover:text-foreground"
          onClick={onDismiss}
        >
          Not now
        </button>
      ) : null}
    </div>
  );

  if (variant === "modal") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
        role="dialog"
        aria-modal="true"
        onClick={onDismiss}
      >
        <div
          className="w-full max-w-md rounded-xl bg-surface border border-border p-5 shadow-lg"
          data-testid="paywall"
          data-paywall-trigger={trigger}
          onClick={(e) => e.stopPropagation()}
        >
          {inner}
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid="paywall"
      data-paywall-trigger={trigger}
      className="rounded-xl border border-primary/40 bg-primary/5 dark:bg-primary/10 p-4 md:p-5"
    >
      {inner}
    </div>
  );
}
