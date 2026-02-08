"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

interface UserProfile {
  id: string;
  name: string;
  defaultNickname: string | null;
  gamesPlayed: number;
  gamesWon: number;
  totalPoints: number;
  skipTour: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ProfilePage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultNickname, setDefaultNickname] = useState("");
  const [skipTour, setSkipTour] = useState(false);

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

  if (!isLoaded || !isSignedIn) {
    return null; // Will redirect via useEffect
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-8 border border-neutral-200 dark:border-neutral-800">
            <p className="text-center">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-8 border border-neutral-200 dark:border-neutral-800">
        <h1 className="text-page-title text-foreground mb-6">Profile</h1>

        {error && (
          <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        {/* User Stats */}
        {profile && (
          <div className="mb-8">
            <h2 className="text-section-title text-foreground mb-4">Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Games Played
                </div>
                <div className="text-2xl font-bold">{profile.gamesPlayed}</div>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Games Won
                </div>
                <div className="text-2xl font-bold">{profile.gamesWon}</div>
              </div>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4">
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mb-1">
                  Total Points
                </div>
                <div className="text-2xl font-bold">{profile.totalPoints}</div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Settings */}
        <div className="space-y-6">
          <h2 className="text-section-title text-foreground">Settings</h2>

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
            />
            <p className="text-caption mt-1">
              This nickname will be used as the default when joining rooms. You can still override it per room.
            </p>
          </div>

          {/* Skip Tour */}
          <div className="flex items-center gap-3">
            <Checkbox
              id="skipTour"
              checked={skipTour}
              onChange={(e) => setSkipTour(e.target.checked)}
            />
            <Label htmlFor="skipTour" className="cursor-pointer !mb-0">
              Don&apos;t show interactive tour when games start
            </Label>
          </div>

          {/* Save Button */}
          <Button
            variant="outline-primary"
            size="lg"
            fullWidth
            onClick={handleSave}
            isLoading={isSaving}
          >
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
