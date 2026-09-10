"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAgeGate } from "@/components/auth/age-gate-provider";

import { formatGameNightEnd } from "@/lib/billing/format-game-night";
import type { EntitlementPlan } from "@/lib/billing/entitlements";
import { BILLING_CATALOG } from "@/lib/billing/plans";

interface UserEntitlementsPayload {
  isPremium: boolean;
  hasActiveGameNightPass: boolean;
  hasMonthlySubscription: boolean;
  hasLifetimeAccess: boolean;
  isAdFree: boolean;
  plan: EntitlementPlan;
  gameNightPassExpiresAt: string | null;
}

interface UserProfile {
  id: string;
  name: string;
  defaultNickname: string | null;
  gamesPlayed: number;
  gamesWon: number;
  totalPoints: number;
  skipTour: boolean;
  is21Plus: boolean | null;
  ageConfirmedAt: string | null;
  subscriptionStatus: string;
  subscriptionCurrentPeriodEnd: string | null;
  gameNightPassExpiresAt: string | null;
  lifetimeAccess: boolean;
  isPremium: boolean;
  entitlements?: UserEntitlementsPayload;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const { confirmAge, refreshAgeGate } = useAgeGate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingAge, setIsUpdatingAge] = useState(false);
  const [ageCheckbox, setAgeCheckbox] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultNickname, setDefaultNickname] = useState("");
  const [skipTour, setSkipTour] = useState(false);
  const [billingLoading, setBillingLoading] = useState(false);

  const openBillingPortal = async () => {
    setBillingLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not open billing portal");
      }
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Billing portal failed");
      setBillingLoading(false);
    }
  };

  // Redirect to sign-in if not authenticated
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push(`/sign-in?redirect_url=${encodeURIComponent("/profile")}`);
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch profile data
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (!response.ok) {
          throw new Error("Failed to fetch profile");
        }
        const data = await response.json();
        setProfile(data.profile);
        setDefaultNickname(data.profile.defaultNickname || "");
        setSkipTour(data.profile.skipTour);
        setAgeCheckbox(data.profile.is21Plus === true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [isLoaded, isSignedIn]);

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultNickname: defaultNickname.trim() || null,
          skipTour,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update profile");
      }

      const data = await response.json();
      setProfile(data.profile);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAgeConfirm = async (is21Plus: boolean) => {
    setIsUpdatingAge(true);
    setError(null);
    try {
      await confirmAge(is21Plus);
      await refreshAgeGate();
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = await response.json();
        setProfile(data.profile);
        setAgeCheckbox(data.profile.is21Plus === true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update age confirmation");
    } finally {
      setIsUpdatingAge(false);
    }
  };

  if (!isLoaded || !isSignedIn) {
    return null; // Will redirect via useEffect
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-7.5rem)] items-center justify-center px-4 py-6 bg-background">
        <div className="w-full max-w-2xl">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
            <p className="text-center">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-6 max-w-4xl min-h-[calc(100vh-7.5rem)] bg-background">
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
        <h1 className="text-xl md:text-page-title text-foreground mb-4 md:mb-6">Profile</h1>

        {error && (
          <div className="mb-4 md:mb-6 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm">
            {error}
          </div>
        )}

        {/* User Stats */}
        {profile && (
          <div className="mb-6 md:mb-8">
            <h2 className="text-lg md:text-section-title text-foreground mb-3 md:mb-4">Statistics</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 min-h-[80px] flex flex-col justify-center">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Games Played
                </div>
                <div className="text-xl md:text-2xl font-bold">{profile.gamesPlayed}</div>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 min-h-[80px] flex flex-col justify-center">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Games Won
                </div>
                <div className="text-xl md:text-2xl font-bold">{profile.gamesWon}</div>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 min-h-[80px] flex flex-col justify-center">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Total Points
                </div>
                <div className="text-xl md:text-2xl font-bold">{profile.totalPoints}</div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Settings */}
        <div className="space-y-4 md:space-y-6">
          <h2 className="text-lg md:text-section-title text-foreground">Settings</h2>

          {/* Default Nickname */}
          <div>
            <Label htmlFor="defaultNickname" className="mb-2">Default Nickname</Label>
            <Input
              id="defaultNickname"
              type="text"
              value={defaultNickname}
              onChange={(e) => setDefaultNickname(e.target.value.slice(0, 50))}
              placeholder="Enter a default nickname"
              maxLength={50}
              className="min-h-[48px]"
            />
            <p className="text-caption mt-1">
              This nickname will be used as the default when joining rooms. You can still override it per room.
            </p>
          </div>

          {/* Skip Tour */}
          <div className="flex items-center gap-3 min-h-[44px]">
            <Checkbox
              id="skipTour"
              checked={skipTour}
              onChange={(e) => setSkipTour(e.target.checked)}
            />
            <Label htmlFor="skipTour" className="cursor-pointer !mb-0">
              Don&apos;t show interactive tour when games start
            </Label>
          </div>

          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
            <div>
              <h3 className="text-base font-semibold text-foreground">Age confirmation</h3>
              <p className="text-caption mt-1">
                {profile?.is21Plus === true
                  ? "You confirmed you are 21 or older."
                  : profile?.is21Plus === false
                    ? "You confirmed you are under 21 — non-drinking mode only."
                    : "Not confirmed yet."}
                {profile?.ageConfirmedAt
                  ? ` Last updated ${new Date(profile.ageConfirmedAt).toLocaleString()}.`
                  : null}
              </p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={ageCheckbox}
                onChange={(e) => setAgeCheckbox(e.target.checked)}
                disabled={isUpdatingAge}
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                I confirm I am 21 years of age or older.
              </span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={!ageCheckbox || isUpdatingAge}
                isLoading={isUpdatingAge && ageCheckbox}
                onClick={() => void handleAgeConfirm(true)}
              >
                Save as 21+
              </Button>
              <Button
                variant="tertiary"
                size="sm"
                disabled={isUpdatingAge}
                onClick={() => void handleAgeConfirm(false)}
              >
                I am under 21
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 space-y-3">
            <BillingSection
              profile={profile}
              billingLoading={billingLoading}
              onOpenPortal={() => void openBillingPortal()}
              onUpgrade={() => router.push("/upgrade")}
            />
          </div>

          {/* Save Button */}
          <Button
            variant="outline-primary"
            size="lg"
            fullWidth
            onClick={handleSave}
            isLoading={isSaving}
            className="min-h-[48px]"
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}

function BillingSection({
  profile,
  billingLoading,
  onOpenPortal,
  onUpgrade,
}: {
  profile: UserProfile | null;
  billingLoading: boolean;
  onOpenPortal: () => void;
  onUpgrade: () => void;
}) {
  const plan = profile?.entitlements?.plan ?? (profile?.isPremium ? "monthly" : "free");
  const passEnd =
    profile?.entitlements?.gameNightPassExpiresAt ??
    profile?.gameNightPassExpiresAt;

  let title = "Free plan";
  let caption = "Useful free hosting. Upgrade only when you need more.";
  if (plan === "lifetime") {
    title = "FoulPlay+ Lifetime";
    caption = "No recurring payment.";
  } else if (plan === "monthly") {
    title = "FoulPlay+ Monthly";
    caption = profile?.subscriptionCurrentPeriodEnd
      ? `Renews ${new Date(profile.subscriptionCurrentPeriodEnd).toLocaleDateString()}.`
      : "Active monthly subscription.";
  } else if (plan === "game_night") {
    title = "Game Night active";
    caption = passEnd
      ? formatGameNightEnd(passEnd)
      : "24-hour host pass is active.";
  }

  return (
    <>
      <div>
        <h3 className="text-base font-semibold text-foreground">Premium</h3>
        <p className="text-caption mt-1">
          <span className="font-medium text-foreground">{title}</span>
          {" — "}
          {caption}
        </p>
      </div>
      {plan === "monthly" ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onOpenPortal}
          isLoading={billingLoading}
        >
          Manage subscription
        </Button>
      ) : plan === "lifetime" ? (
        <p className="text-xs text-neutral-500">Thanks for the early support.</p>
      ) : plan === "game_night" ? (
        <Button variant="primary" size="sm" onClick={onUpgrade}>
          Upgrade to {BILLING_CATALOG.monthly.name} — {BILLING_CATALOG.monthly.displayPrice}/mo
        </Button>
      ) : (
        <Button variant="primary" size="sm" onClick={onUpgrade}>
          Upgrade
        </Button>
      )}
    </>
  );
}
