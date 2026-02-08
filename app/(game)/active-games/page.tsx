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
        console.error("Failed to fetch active games:", err);
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
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-8 border border-neutral-200 dark:border-neutral-800">
        <h1 className="text-page-title text-foreground mb-6">Active Games</h1>

        {isLoading ? (
          <p className="text-neutral-600 dark:text-neutral-400">
            Loading games...
          </p>
        ) : activeGames.length === 0 ? (
          <p className="text-neutral-600 dark:text-neutral-400 mb-6">
            No active games. Create or join a room to get started!
          </p>
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

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/create"
            className="text-sm font-medium text-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
          >
            Create a room
          </Link>
          <Link
            href="/join"
            className="link-accent text-sm font-medium hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded"
          >
            Join a room
          </Link>
        </div>
      </div>
    </div>
  );
}
