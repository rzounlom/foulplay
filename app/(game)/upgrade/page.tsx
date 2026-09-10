"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BILLING_CATALOG, type BillingPlanId } from "@/lib/billing/plans";
import { redirectToCheckout } from "@/lib/billing/start-checkout";

export default function UpgradePageWrapper() {
  return (
    <Suspense
      fallback={
        <div className="max-w-lg mx-auto px-4 py-16 text-center text-neutral-500">
          Loading…
        </div>
      }
    >
      <UpgradePage />
    </Suspense>
  );
}

function UpgradePage() {
  const searchParams = useSearchParams();
  const success = searchParams.get("success") === "1";
  const canceled = searchParams.get("canceled") === "1";
  const [loadingPlan, setLoadingPlan] = useState<BillingPlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canceled) return;
    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "checkout_canceled",
        props: {
          trigger: searchParams.get("trigger") ?? "upgrade_page",
          plan: searchParams.get("plan"),
        },
      }),
      credentials: "include",
    }).catch(() => {});
  }, [canceled, searchParams]);

  const start = useCallback(async (plan: BillingPlanId) => {
    setLoadingPlan(plan);
    setError(null);
    try {
      await redirectToCheckout({
        plan,
        trigger: "upgrade_page",
        returnPath: "/upgrade",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start checkout");
      setLoadingPlan(null);
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-16">
      <h1 className="text-2xl md:text-page-title text-foreground mb-2">
        Host upgrades. Everyone else plays free.
      </h1>
      <p className="text-neutral-600 dark:text-neutral-300 mb-2">
        Join any game for free. Hosting stays useful on the free plan — pay only
        when you need a bigger room, more games, or a public lobby.
      </p>
      <p className="text-sm font-medium text-foreground mb-6">
        Only the host upgrades. Everyone else plays free.
      </p>

      {success ? (
        <div className="mb-6 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-sm text-green-800 dark:text-green-200">
          You&apos;re all set — access may take a moment to activate after
          payment. Head back to your game lobby.
        </div>
      ) : null}
      {canceled ? (
        <div className="mb-6 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
          Checkout canceled. You can upgrade anytime.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <PlanCard
          plan="game_night"
          loadingPlan={loadingPlan}
          onSelect={start}
        />
        <PlanCard
          plan="monthly"
          loadingPlan={loadingPlan}
          onSelect={start}
          featured
        />
        <PlanCard
          plan="lifetime"
          loadingPlan={loadingPlan}
          onSelect={start}
        />
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-400 text-center">
        Secure checkout powered by Stripe. Test mode — no live charges.
      </p>

      <p className="mt-6 text-center text-sm">
        <Link href="/profile" className="text-primary hover:underline">
          Back to profile
        </Link>
      </p>
    </div>
  );
}

function PlanCard({
  plan,
  loadingPlan,
  onSelect,
  featured = false,
}: {
  plan: BillingPlanId;
  loadingPlan: BillingPlanId | null;
  onSelect: (plan: BillingPlanId) => void;
  featured?: boolean;
}) {
  const catalog = BILLING_CATALOG[plan];
  return (
    <div
      className={`rounded-xl border bg-surface p-5 shadow-sm space-y-3 flex flex-col ${
        featured
          ? "border-primary ring-2 ring-primary/30 md:-mt-1 md:mb-1"
          : "border-border"
      }`}
    >
      {featured ? (
        <p className="text-[10px] uppercase tracking-wide font-semibold text-primary">
          Best for regular hosts
        </p>
      ) : null}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {catalog.name}
        </h2>
        <p className="mt-1 text-2xl font-bold text-foreground">
          {catalog.displayPrice}
          <span className="text-sm font-medium text-neutral-500">
            {plan === "monthly" ? catalog.cadence : ` · ${catalog.cadence}`}
          </span>
        </p>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          {catalog.headline}
        </p>
      </div>
      <ul className="text-sm text-neutral-700 dark:text-neutral-300 space-y-1.5 list-disc pl-5 flex-1">
        {catalog.includes.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <Button
        variant={featured ? "primary" : "secondary"}
        size="lg"
        fullWidth
        onClick={() => onSelect(plan)}
        isLoading={loadingPlan === plan}
        disabled={loadingPlan !== null}
        className="min-h-[48px]"
      >
        {catalog.cta}
      </Button>
    </div>
  );
}
