"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

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

interface ActiveGame {
  code: string;
  status: string;
  mode: string | null;
  sport: string | null;
  playerCount: number;
  isHost: boolean;
  updatedAt: string;
}

export default function ProfilePage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingGames, setIsLoadingGames] = useState(true);
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

  // Fetch active games
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const fetchActiveGames = async () => {
      try {
        const response = await fetch("/api/user/active-games");
        if (response.ok) {
          const data = await response.json();
          setActiveGames(data.games || []);
        }
      } catch (err) {
        console.error("Failed to fetch active games:", err);
      } finally {
        setIsLoadingGames(false);
      }
    };

    fetchActiveGames();
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
        <h1 className="text-3xl font-bold mb-6">Profile</h1>

        {error && (
          <div className="mb-6 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        {/* Active Games */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Active Games</h2>
          {isLoadingGames ? (
            <p className="text-neutral-600 dark:text-neutral-400">Loading games...</p>
          ) : activeGames.length === 0 ? (
            <p className="text-neutral-600 dark:text-neutral-400">No active games. Create or join a room to get started!</p>
          ) : (
            <div className="space-y-3">
              {activeGames.map((game) => (
                <Link
                  key={game.code}
                  href={`/game/${game.code}`}
                  className="block p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-lg">{game.code}</span>
                        {game.isHost && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                            Host
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded ${
                          game.status === "active"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                        }`}>
                          {game.status === "active" ? "In Progress" : "Lobby"}
                        </span>
                      </div>
                      <div className="text-sm text-neutral-600 dark:text-neutral-400">
                        {game.mode && game.sport ? (
                          <span>{game.mode} • {game.sport}</span>
                        ) : (
                          <span>No settings</span>
                        )}
                        <span className="ml-2">• {game.playerCount} player{game.playerCount !== 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <svg
                      className="w-5 h-5 text-neutral-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* User Stats */}
        {profile && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Statistics</h2>
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
          <h2 className="text-xl font-semibold">Settings</h2>

          {/* Default Nickname */}
          <div>
            <label htmlFor="defaultNickname" className="block text-sm font-medium mb-2">
              Default Nickname
            </label>
            <input
              id="defaultNickname"
              type="text"
              value={defaultNickname}
              onChange={(e) => setDefaultNickname(e.target.value.slice(0, 50))}
              placeholder="Enter a default nickname"
              maxLength={50}
              className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              This nickname will be used as the default when joining rooms. You can still override it per room.
            </p>
          </div>

          {/* Skip Tour */}
          <div className="flex items-center gap-3">
            <input
              id="skipTour"
              type="checkbox"
              checked={skipTour}
              onChange={(e) => setSkipTour(e.target.checked)}
              className="w-4 h-4 text-primary border-neutral-300 dark:border-neutral-700 rounded cursor-pointer"
            />
            <label htmlFor="skipTour" className="text-sm font-medium cursor-pointer">
              Don&apos;t show interactive tour when games start
            </label>
          </div>

          {/* Save Button */}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 px-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
