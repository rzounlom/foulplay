"use client";

import { useCallback, useMemo, useState } from "react";
import type { LobbyPartnerLink } from "@/lib/partners/lobby-links";
import { Button } from "@/components/ui/button";

type LobbyMonetizationStripProps = {
  sport: string | null;
  partnerLinks: LobbyPartnerLink[];
  isPremium: boolean;
  stripeEnabled: boolean;
};

export function LobbyMonetizationStrip({
  sport,
  partnerLinks,
  isPremium,
  stripeEnabled,
}: LobbyMonetizationStripProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const sportLabel = sport === "basketball" ? "NBA" : "NFL";

  const showStrip = useMemo(() => {
    if (isPremium) return false;
    return partnerLinks.length > 0 || stripeEnabled;
  }, [isPremium, partnerLinks.length, stripeEnabled]);

  const startCheckout = useCallback(async () => {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: "monthly",
          trigger: "ad_strip",
          returnPath:
            typeof window !== "undefined" ? window.location.pathname : "/upgrade",
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout");
      }
      window.location.href = data.url;
    } catch (e) {
      setCheckoutError(
        e instanceof Error ? e.message : "Could not start checkout",
      );
      setCheckoutLoading(false);
    }
  }, []);

  if (!showStrip) {
    return null;
  }

  return (
    <>
      <div className="mt-8 pt-6 border-t border-neutral-200 dark:border-neutral-800" data-testid="lobby-partner-strip">
        <p className="text-[10px] uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
          Watch party picks
        </p>
        {partnerLinks.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {partnerLinks.map((link) => (
              <a
                key={link.id}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer sponsored"
                className="text-sm font-medium text-primary hover:underline underline-offset-2"
              >
                {link.label}
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
            Free {sportLabel} rooms include partner links to help cover costs.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="hover:text-foreground underline-offset-2 hover:underline"
          >
            Why am I seeing this?
          </button>
          {stripeEnabled ? (
            <>
              <span aria-hidden>·</span>
              <button
                type="button"
                onClick={() => void startCheckout()}
                disabled={checkoutLoading}
                className="font-medium text-primary hover:underline underline-offset-2 disabled:opacity-60"
              >
                {checkoutLoading ? "Loading…" : "Go ad-free"}
              </button>
            </>
          ) : null}
        </div>
        {checkoutError ? (
          <p className="mt-2 text-xs text-red-600 dark:text-red-400">{checkoutError}</p>
        ) : null}
        <p className="mt-2 text-[10px] text-neutral-400 dark:text-neutral-500">
          We may earn a commission from partner links.
        </p>
      </div>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lobby-monetization-title"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-surface border border-border p-5 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="lobby-monetization-title"
              className="text-lg font-semibold text-foreground"
            >
              Why partner links?
            </h2>
            <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
              Free FoulPlay rooms show optional watch-party links (gear, snacks,
              streaming) so we can keep the game free to play. Premium members
              don&apos;t see them.
            </p>
            {stripeEnabled ? (
              <div className="mt-4 flex flex-col sm:flex-row gap-2">
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => void startCheckout()}
                  isLoading={checkoutLoading}
                >
                  Upgrade — go ad-free
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  className="flex-1"
                  onClick={() => setModalOpen(false)}
                >
                  Got it
                </Button>
              </div>
            ) : (
              <Button
                variant="secondary"
                size="md"
                className="mt-4 w-full"
                onClick={() => setModalOpen(false)}
              >
                Got it
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
