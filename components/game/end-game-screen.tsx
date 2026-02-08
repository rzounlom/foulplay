"use client";

import Link from "next/link";

interface LeaderboardEntry {
  playerId: string;
  name: string;
  nickname: string | null;
  points: number;
}

interface LastGameEndResult {
  winnerId: string;
  winnerName: string;
  winnerNickname: string | null;
  winnerPoints: number;
  leaderboard: LeaderboardEntry[];
}

interface EndGameScreenProps {
  roomCode: string;
  lastGameEndResult: LastGameEndResult;
  isHost?: boolean;
}

function displayName(entry: LeaderboardEntry) {
  return entry.nickname?.trim() || entry.name;
}

export function EndGameScreen({
  roomCode,
  lastGameEndResult,
}: EndGameScreenProps) {
  const { winnerName, winnerNickname, winnerPoints, leaderboard } =
    lastGameEndResult;
  const winnerDisplayName = winnerNickname?.trim() || winnerName;

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-bold text-center text-neutral-900 dark:text-white mb-2">
          Game Over
        </h1>
        <p className="text-center text-neutral-600 dark:text-neutral-400 mb-8">
          Room {roomCode}
        </p>

        {/* Winner highlight */}
        <div className="rounded-2xl bg-primary/15 dark:bg-primary/25 border-2 border-primary/40 p-6 mb-8 text-center">
          <p className="text-sm font-medium text-primary dark:text-primary/90 uppercase tracking-wide mb-1">
            Winner
          </p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">
            {winnerDisplayName}
          </p>
          <p className="text-lg font-semibold text-primary dark:text-primary/90 mt-1">
            {winnerPoints} pts
          </p>
        </div>

        {/* Leaderboard */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-lg overflow-hidden mb-8">
          <h2 className="text-lg font-semibold px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 text-neutral-900 dark:text-white">
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
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-lg font-bold w-8 ${
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
                          ? "text-neutral-900 dark:text-white"
                          : "text-neutral-700 dark:text-neutral-300"
                      }
                    >
                      {displayName(entry)}
                    </span>
                    {isWinner && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/20 text-primary dark:bg-primary/30 dark:text-primary/90">
                        Winner
                      </span>
                    )}
                  </div>
                  <span
                    className={`font-mono font-semibold ${
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

        {/* Actions — same for everyone: create a room or go home */}
        <div className="space-y-3">
          <Link
            href="/create"
            className="inline-flex items-center justify-center w-full py-2.5 px-5 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Create a room
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center w-full py-2.5 px-5 text-sm font-medium rounded-lg bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 border border-neutral-300 dark:border-neutral-600 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
