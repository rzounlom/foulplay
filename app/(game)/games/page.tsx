"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { GamesPageSkeleton } from "@/components/games/games-page-skeleton";

interface Game {
  code: string;
  status: string;
  mode: string | null;
  sport: string | null;
  playerCount: number;
  isHost: boolean;
  updatedAt: string;
}

type Filter = "all" | "active" | "lobby" | "ended";

export default function GamesPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push(
        `/sign-in?redirect_url=${encodeURIComponent("/games")}`
      );
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const fetchGames = async () => {
      try {
        const response = await fetch("/api/user/active-games");
        if (response.ok) {
          const data = await response.json();
          setGames(data.games || []);
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.error("Failed to fetch games:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGames();
  }, [isLoaded, isSignedIn]);

  const filteredAndOrderedGames = useMemo(() => {
    let list = games;
    if (filter === "active") list = games.filter((g) => g.status === "active");
    else if (filter === "lobby") list = games.filter((g) => g.status === "lobby");
    else if (filter === "ended") list = games.filter((g) => g.status === "ended");

    if (filter === "all") {
      const order = { active: 0, lobby: 1, ended: 2 };
      list = [...list].sort((a, b) => (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3));
    }
    return list;
  }, [games, filter]);

  // Show skeleton immediately while Clerk loads, while redirecting, or while fetching
  const showSkeleton = !isLoaded || !isSignedIn || isLoading;
  if (showSkeleton) {
    return <GamesPageSkeleton />;
  }

  const filterButtons: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "In Progress" },
    { value: "lobby", label: "Lobby" },
    { value: "ended", label: "Completed" },
  ];

  const getStatusLabel = (status: string) => {
    if (status === "active") return "In Progress";
    if (status === "lobby") return "Lobby";
    if (status === "ended") return "Completed";
    return status;
  };

  const getStatusStyles = (status: string) => {
    if (status === "active") return "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400";
    if (status === "lobby") return "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300";
    if (status === "ended") return "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400";
    return "bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300";
  };

  const gameCardClass = "block p-4 min-h-[72px] bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-primary transition-colors cursor-pointer active:opacity-90";

  const isEmpty = filteredAndOrderedGames.length === 0;

  return (
    <div className="container mx-auto px-4 py-4 md:py-6 max-w-4xl min-h-[calc(100vh-4.5rem)] bg-background">
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
        <h1 className="text-xl md:text-page-title text-foreground mb-4 md:mb-6">Games</h1>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {filterButtons.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                filter === value
                  ? "bg-primary text-white"
                  : "bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {isEmpty ? (
          <div className="text-center py-8 md:py-10 px-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700 shadow-sm dark:shadow-none">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 dark:bg-primary/20 text-primary mb-4" aria-hidden>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741.479 3 3 0 003-3v.479a9.094 9.094 0 01-3.741.479m-10.5-6.75h.008v.008h-.008V12zm0 0h.008V12h-.008z" />
              </svg>
            </div>
            <h2 className="text-lg md:text-section-title text-neutral-800 dark:text-neutral-200 mb-2">
              {filter === "all" ? "No games" : `No ${filter === "active" ? "in progress" : filter === "lobby" ? "lobby" : "completed"} games`}
            </h2>
            <p className="text-body-muted text-sm md:text-base mb-6 max-w-sm mx-auto">
              Create a room to start a new game, or join one with a code from your friends.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/create"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-lg bg-primary text-white border border-transparent shadow-sm hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors active:opacity-90"
              >
                Create a room
              </Link>
              <Link
                href="/join"
                className="inline-flex items-center justify-center px-5 py-2.5 text-sm font-medium rounded-lg bg-transparent text-primary border border-primary hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary transition-colors active:opacity-90"
              >
                Join a room
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredAndOrderedGames.map((game) => {
              const href = game.status === "ended" ? `/game/${game.code}/end-game` : `/game/${game.code}`;
              return (
                <Link
                  key={game.code}
                  href={href}
                  className={gameCardClass}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-mono font-bold text-lg">
                          {game.code}
                        </span>
                        {game.isHost && (
                          <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded">
                            Host
                          </span>
                        )}
                        <span
                          className={`text-xs px-2 py-1 rounded ${getStatusStyles(game.status)}`}
                        >
                          {getStatusLabel(game.status)}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
