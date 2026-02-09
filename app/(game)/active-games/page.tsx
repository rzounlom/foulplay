"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ActiveGame {
  code: string;
  status: string;
  mode: string | null;
  sport: string | null;
  playerCount: number;
  isHost: boolean;
  updatedAt: string;
}

export default function ActiveGamesPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push(
        `/sign-in?redirect_url=${encodeURIComponent("/active-games")}`
      );
    }
  }, [isLoaded, isSignedIn, router]);

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
        if (process.env.NODE_ENV === "development") console.error("Failed to fetch active games:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActiveGames();
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-2xl min-h-screen bg-background">
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
        <h1 className="text-xl md:text-page-title text-foreground mb-4 md:mb-6">Active Games</h1>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10 md:py-12 text-neutral-500 dark:text-neutral-400">
            <svg className="animate-spin h-8 w-8 mb-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p>Loading games...</p>
          </div>
        ) : activeGames.length === 0 ? (
          <div className="text-center py-8 md:py-10 px-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-none">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 dark:bg-primary/20 text-primary mb-4" aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741.479 3 3 0 003-3v.479a9.094 9.094 0 01-3.741.479m-10.5-6.75h.008v.008h-.008V12zm0 0h.008V12h-.008z" />
              </svg>
            </div>
            <h2 className="text-lg md:text-section-title text-neutral-800 dark:text-neutral-200 mb-2">No active games</h2>
            <p className="text-body-muted text-sm md:text-base mb-6 max-w-sm mx-auto">
              Create a room to start a new game, or join one with a code from your friends.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/create" className="min-h-[44px] inline-flex items-center justify-center text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded px-4 py-3">
                Create a room
              </Link>
              <Link href="/join" className="min-h-[44px] inline-flex items-center justify-center link-accent text-sm font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded px-4 py-3">
                Join a room
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {activeGames.map((game) => (
              <Link
                key={game.code}
                href={`/game/${game.code}`}
                className="block p-4 min-h-[72px] bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary transition-colors cursor-pointer active:opacity-90"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-bold text-lg">
                        {game.code}
                      </span>
                      {game.isHost && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                          Host
                        </span>
                      )}
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          game.status === "active"
                            ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                            : "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300"
                        }`}
                      >
                        {game.status === "active" ? "In Progress" : "Lobby"}
                      </span>
                    </div>
                    <div className="text-sm text-neutral-600 dark:text-neutral-400">
                      {game.mode && game.sport ? (
                        <span>
                          {game.mode} • {game.sport}
                        </span>
                      ) : (
                        <span>No settings</span>
                      )}
                      <span className="ml-2">
                        • {game.playerCount} player
                        {game.playerCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <svg
                    className="w-5 h-5 text-neutral-400 shrink-0"
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

        <div className="mt-6 md:mt-8 flex flex-wrap gap-3">
          <Link
            href="/create"
            className="min-h-[44px] inline-flex items-center justify-center text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded px-4 py-2"
          >
            Create a room
          </Link>
          <Link
            href="/join"
            className="min-h-[44px] inline-flex items-center justify-center link-accent text-sm font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded px-4 py-2"
          >
            Join a room
          </Link>
        </div>
      </div>
    </div>
  );
}
