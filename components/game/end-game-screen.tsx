"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useClerkInFlowSignIn } from "@/lib/auth/use-clerk-in-flow-sign-in";

interface LeaderboardEntry {
  playerId: string;
  name: string;
  nickname: string | null;
  points: number;
}

interface LastGamePlace {
  playerId: string;
  name: string;
  nickname: string | null;
  points: number;
}

interface LastGameBestPlay {
  cardTitle: string;
  points: number;
  voteCount: number;
}

export interface LastGameEndResult {
  winnerId: string;
  winnerName: string;
  winnerNickname: string | null;
  winnerPoints: number;
  leaderboard: LeaderboardEntry[];
  lastPlace?: LastGamePlace;
  bestPlay?: LastGameBestPlay | null;
}

interface EndGameScreenProps {
  roomCode: string;
  lastGameEndResult: LastGameEndResult;
}

function displayName(entry: Pick<LeaderboardEntry, "name" | "nickname">) {
  return entry.nickname?.trim() || entry.name;
}

function useRotatingIndex(length: number, intervalMs: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (length <= 1) return;
    const t = setInterval(() => setI((x) => (x + 1) % length), intervalMs);
    return () => clearInterval(t);
  }, [length, intervalMs]);
  return length <= 1 ? 0 : i;
}

const primaryCtaClassName =
  "inline-flex flex-col items-center justify-center w-full py-3 px-5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary shadow-md";

const secondaryLinkClassName =
  "inline-flex items-center justify-center w-full py-2 px-4 text-sm text-neutral-600 dark:text-neutral-400 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/50 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400";

function RunItBackAction({ sourceRoomCode }: { sourceRoomCode: string }) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { openSignInForReturn, authLoaded } = useClerkInFlowSignIn();
  const ready = isLoaded && authLoaded;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runItBack = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms/run-it-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: sourceRoomCode }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Couldn’t start lobby",
        );
      }
      const code = data.code as string | undefined;
      if (!code) throw new Error("No room code returned");
      router.push(`/game/${code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div
        className="w-full h-14 rounded-xl bg-neutral-200 dark:bg-neutral-700 animate-pulse"
        aria-hidden
      />
    );
  }

  if (!isSignedIn) {
    return (
      <>
        <button
          type="button"
          className={primaryCtaClassName}
          onClick={() =>
            openSignInForReturn(`/game/${sourceRoomCode}/end-game`, {
              title: "Sign in to run it back",
              subtitle: "Same crew, new code — quick sign-in",
            })
          }
        >
          <span className="text-base font-semibold">🔁 Run it back</span>
          <span className="text-xs font-normal text-white/90 mt-0.5">
            Same players. Same chaos.
          </span>
        </button>
        {error && (
          <p className="text-center text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        className={`${primaryCtaClassName} disabled:opacity-60 disabled:pointer-events-none`}
        onClick={() => void runItBack()}
        disabled={loading}
      >
        <span className="text-base font-semibold">
          {loading ? "Starting lobby…" : "🔁 Run it back"}
        </span>
        <span className="text-xs font-normal text-white/90 mt-0.5">
          Same players. Same chaos.
        </span>
      </button>
      {error && (
        <p className="text-center text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </>
  );
}

export function EndGameScreen({
  roomCode,
  lastGameEndResult,
}: EndGameScreenProps) {
  const { winnerName, winnerNickname, winnerPoints, leaderboard, lastPlace, bestPlay } =
    lastGameEndResult;
  const winnerDisplayName = winnerNickname?.trim() || winnerName;
  const celebrationFired = useRef(false);

  const winnerLines = [
    `🏆 ${winnerDisplayName} takes it`,
    `👑 ${winnerDisplayName} runs the table`,
    `🔥 ${winnerDisplayName} went crazy`,
  ];
  const loserConsequenceLines = [
    "Time to pay up 😈",
    "Take 5 drinks 🥤",
    "Let the winner pick your next drink",
    "You owe the group one 😂",
  ];
  const socialLines = [
    "This was chaos 😂 — run it back?",
    "Y’all were wild… one more?",
    "That got out of hand 😭 run it back?",
  ];

  const wi = useRotatingIndex(winnerLines.length, 4800);
  const li = useRotatingIndex(loserConsequenceLines.length, 5200);
  const si = useRotatingIndex(socialLines.length, 4400);

  useEffect(() => {
    if (celebrationFired.current) return;
    celebrationFired.current = true;
    import("canvas-confetti").then(({ default: confetti }) => {
      const duration = 2500;
      const end = Date.now() + duration;
      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: ["#f59e0b", "#eab308", "#84cc16", "#22c55e"],
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: ["#f59e0b", "#eab308", "#84cc16", "#22c55e"],
        });
        if (Date.now() < end) requestAnimationFrame(frame);
      };
      frame();
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <h1 className="text-page-title text-center text-neutral-900 dark:text-white mb-2">
          Game Over
        </h1>
        <p className="text-center text-body-muted mb-6">Room {roomCode}</p>

        {/* Winner */}
        <div className="rounded-2xl bg-primary/15 dark:bg-primary/25 border-2 border-primary/40 p-6 mb-5 text-center shadow-sm">
          <p className="text-sm font-medium text-primary dark:text-primary/90 uppercase tracking-wide mb-2">
            Winner
          </p>
          <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-snug min-h-[3.5rem] flex items-center justify-center">
            {winnerLines[wi]}
          </p>
          <p className="text-lg font-semibold text-primary dark:text-primary/90 mt-2">
            {winnerPoints} pts
          </p>
        </div>

        {/* Last place — lighthearted */}
        {lastPlace && (
          <div className="rounded-xl bg-neutral-100/90 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 p-4 mb-5 text-center">
            <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
              💀 Last place: {displayName(lastPlace)}
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1.5 min-h-[2.5rem] flex items-center justify-center">
              {loserConsequenceLines[li]}
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
              {lastPlace.points} pts — all in good fun
            </p>
          </div>
        )}

        {/* Best play */}
        {bestPlay && bestPlay.points > 0 && (
          <div className="rounded-xl border border-amber-200/80 dark:border-amber-700/50 bg-amber-50/80 dark:bg-amber-950/25 px-4 py-3 mb-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200/90 mb-1">
              Best play
            </p>
            <p className="text-sm text-neutral-800 dark:text-neutral-100">
              <span className="font-semibold">🔥 {bestPlay.cardTitle}</span>
              <span className="text-neutral-600 dark:text-neutral-400">
                {" "}
                (+{bestPlay.points} pts
                {bestPlay.voteCount > 0
                  ? ` · ${bestPlay.voteCount} vote${bestPlay.voteCount === 1 ? "" : "s"}`
                  : ""}
                )
              </span>
            </p>
          </div>
        )}

        {/* Leaderboard */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-lg dark:shadow-none overflow-hidden mb-6">
          <h2 className="text-section-title px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white">
            Final scores
          </h2>
          <ul className="divide-y divide-neutral-200 dark:divide-neutral-700">
            {leaderboard.map((entry, index) => {
              const isWinner = entry.playerId === lastGameEndResult.winnerId;
              return (
                <li
                  key={entry.playerId}
                  className={`flex items-center justify-between px-4 py-3 ${
                    isWinner
                      ? "bg-primary/10 dark:bg-primary/20 font-semibold"
                      : "bg-white dark:bg-neutral-900"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`text-lg font-bold w-8 shrink-0 ${
                        index === 0
                          ? "text-amber-500 dark:text-amber-400"
                          : index === 1
                            ? "text-neutral-400 dark:text-neutral-500"
                            : index === 2
                              ? "text-amber-700 dark:text-amber-600"
                              : "text-neutral-400 dark:text-neutral-500"
                      }`}
                    >
                      #{index + 1}
                    </span>
                    <span
                      className={
                        isWinner
                          ? "text-neutral-900 dark:text-white truncate"
                          : "text-neutral-700 dark:text-neutral-300 truncate"
                      }
                    >
                      {displayName(entry)}
                    </span>
                    {isWinner && (
                      <span className="shrink-0 text-xs font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary/90">
                        Winner
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-mono font-semibold shrink-0 tabular-nums ${
                      isWinner
                        ? "text-primary dark:text-primary/90"
                        : "text-neutral-600 dark:text-neutral-400"
                    }`}
                  >
                    {entry.points} pts
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Social + CTAs */}
        <div className="space-y-4">
          <p className="text-center text-sm font-medium text-neutral-700 dark:text-neutral-300 min-h-[2.75rem] flex items-center justify-center px-2">
            {socialLines[si]}
          </p>

          <RunItBackAction sourceRoomCode={roomCode} />

          <div className="pt-1 space-y-2 border-t border-neutral-200 dark:border-neutral-700">
            <Link href="/games" className={secondaryLinkClassName}>
              My Games
            </Link>
            <Link href="/" className={secondaryLinkClassName}>
              Go Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
