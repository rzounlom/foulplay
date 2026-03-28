"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useClerkInFlowSignIn } from "@/lib/auth/use-clerk-in-flow-sign-in";
import { useRoomChannel } from "@/lib/ably/useRoomChannel";
import { useToast } from "@/components/ui/toast";

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

export interface RematchRosterPlayer {
  userId: string;
  displayName: string;
  isHost: boolean;
}

interface EndGameScreenProps {
  roomCode: string;
  lastGameEndResult: LastGameEndResult;
  rematch: {
    roster: RematchRosterPlayer[];
    currentUserId: string;
    hostUserId: string;
    initialReadyUserIds: string[];
  };
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

const secondaryLinkClassName =
  "inline-flex items-center justify-center w-full py-2 px-4 text-sm text-neutral-600 dark:text-neutral-400 border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700 hover:bg-neutral-100/80 dark:hover:bg-neutral-800/50 rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400";

type RematchStatePayload = {
  readyUserIds: string[];
  totalPlayers: number;
  roster: RematchRosterPlayer[];
  hostUserId: string;
  spawnLobbyCode: string | null;
  spawnMemberUserIds: string[];
};

function RematchSection({
  roomCode,
  rematch,
}: {
  roomCode: string;
  rematch: EndGameScreenProps["rematch"];
}) {
  const router = useRouter();
  const toast = useToast();
  const { isSignedIn, isLoaded } = useUser();
  const { openSignInForReturn, authLoaded } = useClerkInFlowSignIn();
  const authReady = isLoaded && authLoaded;

  const { currentUserId, hostUserId } = rematch;
  const isHost = currentUserId === hostUserId;

  const rosterByUserId = useMemo(() => {
    const m = new Map<string, RematchRosterPlayer>();
    for (const p of rematch.roster) m.set(p.userId, p);
    return m;
  }, [rematch.roster]);

  const [readyUserIds, setReadyUserIds] = useState<string[]>(() => [
    ...rematch.initialReadyUserIds,
  ]);
  const [optInLoading, setOptInLoading] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const handledSpawnRef = useRef<string | null>(null);
  const prevReadyRef = useRef<string[] | null>(null);
  const [joinFlash, setJoinFlash] = useState<string | null>(null);
  const joinFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const totalPlayers = rematch.roster.length;
  const readyCount = readyUserIds.length;
  const imReady = readyUserIds.includes(currentUserId);

  const waitingOnNames = useMemo(() => {
    return rematch.roster
      .filter((p) => !readyUserIds.includes(p.userId))
      .map((p) => p.displayName);
  }, [rematch.roster, readyUserIds]);

  const applySpawn = useCallback(
    (newCode: string, members: string[]) => {
      if (!newCode) return;

      const storageKey = `rematch-handled-${roomCode}`;
      if (typeof window !== "undefined") {
        const seen = sessionStorage.getItem(storageKey);
        if (seen === newCode) {
          handledSpawnRef.current = newCode;
          return;
        }
      }
      if (handledSpawnRef.current === newCode) return;
      handledSpawnRef.current = newCode;
      if (typeof window !== "undefined") {
        sessionStorage.setItem(storageKey, newCode);
      }

      const inGame = members.includes(currentUserId);
      if (inGame) {
        router.push(`/game/${newCode}`);
        return;
      }

      toast.addToast("Game started without you 😬", "info", {
        label: "Join anyway",
        onClick: () => router.push(`/join?code=${newCode}`),
      });
    },
    [currentUserId, roomCode, router, toast],
  );

  const mergeState = useCallback(
    (payload: RematchStatePayload) => {
      setReadyUserIds(payload.readyUserIds);
      if (payload.spawnLobbyCode) {
        applySpawn(
          payload.spawnLobbyCode,
          Array.isArray(payload.spawnMemberUserIds)
            ? payload.spawnMemberUserIds
            : [],
        );
      }
    },
    [applySpawn],
  );

  const fetchRematchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${roomCode}/rematch-state`);
      if (!res.ok) return;
      const data = (await res.json()) as RematchStatePayload;
      if (!Array.isArray(data.readyUserIds)) return;
      mergeState(data);
    } catch {
      /* ignore */
    }
  }, [roomCode, mergeState]);

  useEffect(() => {
    void fetchRematchState();
    const id = setInterval(() => void fetchRematchState(), 2500);
    return () => clearInterval(id);
  }, [fetchRematchState]);

  useRoomChannel(roomCode, (event, data) => {
    if (event === "rematch_ready_updated") {
      const ids = data.readyUserIds;
      if (Array.isArray(ids) && ids.every((x) => typeof x === "string")) {
        setReadyUserIds([...new Set(ids as string[])]);
      }
      return;
    }
    if (event === "rematch_started") {
      const newCode = data.newRoomCode;
      const members = data.memberUserIds;
      if (
        typeof newCode === "string" &&
        Array.isArray(members) &&
        members.every((x) => typeof x === "string")
      ) {
        applySpawn(newCode, members as string[]);
      }
    }
  });

  /* Join feedback: new ready ids vs previous (skip first sync) */
  useEffect(() => {
    if (prevReadyRef.current === null) {
      prevReadyRef.current = [...readyUserIds];
      return;
    }
    const prev = new Set(prevReadyRef.current);
    const added = readyUserIds.filter((id) => !prev.has(id));
    prevReadyRef.current = [...readyUserIds];
    if (added.length === 0) return;

    if (joinFlashTimerRef.current) clearTimeout(joinFlashTimerRef.current);

    let msg: string;
    if (added.length === 1 && added[0] === currentUserId) {
      msg = "You’re in 🔥";
    } else if (added.length === 1) {
      const name = rosterByUserId.get(added[0]!)?.displayName ?? "Someone";
      msg = `${name} is in 🔥`;
    } else {
      msg = `${added.length} players just jumped in 🔥`;
    }
    setJoinFlash(msg);
    joinFlashTimerRef.current = setTimeout(() => {
      setJoinFlash(null);
      joinFlashTimerRef.current = null;
    }, 3200);
    return () => {
      if (joinFlashTimerRef.current) {
        clearTimeout(joinFlashTimerRef.current);
        joinFlashTimerRef.current = null;
      }
    };
  }, [readyUserIds, currentUserId, rosterByUserId]);

  const handleOptIn = async () => {
    if (!isSignedIn || optInLoading || imReady) return;
    setOptInLoading(true);
    setReadyUserIds((prev) =>
      prev.includes(currentUserId) ? prev : [...prev, currentUserId],
    );
    try {
      const res = await fetch("/api/rooms/rematch/ready", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Couldn’t opt in",
        );
      }
      if (Array.isArray(body.readyUserIds)) {
        setReadyUserIds(body.readyUserIds);
      }
    } catch (e) {
      setReadyUserIds((prev) => prev.filter((id) => id !== currentUserId));
      toast.addToast(
        e instanceof Error ? e.message : "Couldn’t opt in",
        "error",
      );
    } finally {
      setOptInLoading(false);
    }
  };

  const handleStartNext = async () => {
    if (!isHost || startLoading) return;
    setStartLoading(true);
    setStartError(null);
    try {
      const res = await fetch("/api/rooms/rematch/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body.error === "string" ? body.error : "Couldn’t start lobby",
        );
      }
      const code = body.code as string | undefined;
      const members = body.memberUserIds as string[] | undefined;
      if (code && Array.isArray(members)) {
        applySpawn(code, members);
      }
    } catch (e) {
      setStartError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setStartLoading(false);
    }
  };

  const primaryRunClass =
    "inline-flex flex-col items-center justify-center w-full py-3.5 px-5 rounded-xl bg-primary text-white hover:bg-primary/90 transition-transform active:scale-[0.99] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 disabled:pointer-events-none shadow-md";

  const hostSecondaryClass =
    "inline-flex items-center justify-center w-full py-2.5 px-4 rounded-xl border-2 border-emerald-600 dark:border-emerald-500 text-emerald-800 dark:text-emerald-300 bg-surface dark:bg-neutral-900/80 text-sm font-semibold hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500 disabled:opacity-60 disabled:pointer-events-none";

  const openSignIn = () =>
    openSignInForReturn(`/game/${roomCode}/end-game`, {
      title: "Sign in to run it back",
      subtitle: "Same crew. New chaos.",
    });

  const primaryInner = (
    <>
      <span className="text-base font-bold tracking-tight">
        {optInLoading ? "Saving…" : "🔥 Run it back"}
      </span>
      <span className="text-xs font-medium text-white/90 mt-0.5">
        Tap to join the rematch
      </span>
    </>
  );

  if (!authReady) {
    return (
      <div
        id="end-game-rematch"
        className="w-full min-h-[14rem] rounded-2xl bg-neutral-200 dark:bg-neutral-700 animate-pulse border-2 border-neutral-300/50 dark:border-neutral-600"
        aria-hidden
      />
    );
  }

  return (
    <>
      <section
        id="end-game-rematch"
        className="rounded-2xl border-2 border-primary/45 bg-surface dark:bg-neutral-900 shadow-[0_8px_32px_rgba(255,102,0,0.12)] dark:shadow-[0_8px_32px_rgba(255,102,0,0.08)] p-5 mb-5 scroll-mt-4"
        aria-labelledby="rematch-heading"
      >
        <h2
          id="rematch-heading"
          className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white text-center"
        >
          Run it back?
        </h2>
        <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-1 mb-4">
          Same crew. New chaos.
        </p>

        <div className="rounded-xl bg-primary/8 dark:bg-primary/15 border border-primary/25 px-4 py-3 mb-4">
          <p
            className="text-center text-lg sm:text-xl font-bold text-primary tabular-nums"
            aria-live="polite"
          >
            <span key={readyCount} className="inline-block rematch-count-pop">
              {readyCount} / {totalPlayers}
            </span>{" "}
            <span className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
              players ready
            </span>
          </p>
          {waitingOnNames.length > 0 ? (
            <p className="text-center text-sm text-neutral-700 dark:text-neutral-300 mt-2 leading-snug">
              <span className="font-medium text-neutral-500 dark:text-neutral-400">
                Waiting on:{" "}
              </span>
              {waitingOnNames.join(", ")}
            </p>
          ) : readyCount > 0 ? (
            <p className="text-center text-sm font-medium text-emerald-700 dark:text-emerald-400 mt-2">
              Everyone’s raised their hand — host can roll 🚀
            </p>
          ) : (
            <p className="text-center text-sm text-neutral-600 dark:text-neutral-400 mt-2">
              Be the first to tap below
            </p>
          )}
          {joinFlash && (
            <p
              className="text-center text-sm font-semibold text-primary mt-2 min-h-[1.25rem] rematch-join-flash"
              key={joinFlash}
              aria-live="polite"
            >
              {joinFlash}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {isSignedIn && imReady && (
            <p className="md:hidden text-center text-sm font-bold text-emerald-700 dark:text-emerald-400">
              ✅ You’re in
            </p>
          )}

          {/* Primary CTA in-card: tablet/desktop (mobile uses sticky bar) */}
          <div className="hidden md:block space-y-3">
            {isSignedIn ? (
              imReady ? (
                <div
                  className={`${primaryRunClass} bg-neutral-600 hover:bg-neutral-600 cursor-default shadow-none`}
                >
                  <span className="text-base font-bold">✅ You’re in</span>
                  <span className="text-xs font-medium text-white/90 mt-0.5">
                    Same crew. New chaos.
                  </span>
                </div>
              ) : (
                <button
                  type="button"
                  className={`${primaryRunClass} rematch-cta-pulse`}
                  onClick={() => void handleOptIn()}
                  disabled={optInLoading}
                >
                  {primaryInner}
                </button>
              )
            ) : (
              <button
                type="button"
                className={`${primaryRunClass} rematch-cta-pulse`}
                onClick={openSignIn}
              >
                <span className="text-base font-bold">🔥 Run it back</span>
                <span className="text-xs font-medium text-white/90 mt-0.5">
                  Sign in to join the rematch
                </span>
              </button>
            )}
          </div>

          {isHost && (
            <div className="pt-1 space-y-1.5">
              <button
                type="button"
                className={hostSecondaryClass}
                onClick={() => void handleStartNext()}
                disabled={startLoading}
              >
                {startLoading ? "Creating lobby…" : "🚀 Start next game"}
              </button>
              <p className="text-[11px] text-center text-neutral-500 dark:text-neutral-400">
                Start anytime — not everyone has to be ready.
              </p>
              {startError && (
                <p className="text-xs text-center text-red-600 dark:text-red-400">
                  {startError}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Sticky mobile CTA — primary action only (in-card CTA is md+) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
        <div className="pointer-events-auto px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-background from-85% to-transparent border-t border-border/70 backdrop-blur-sm dark:border-neutral-800/80">
          {isSignedIn ? (
            imReady ? (
              <div className="w-full py-2.5 rounded-xl bg-neutral-600/95 text-white text-center text-sm font-semibold shadow-lg">
                ✅ You’re in
              </div>
            ) : (
              <button
                type="button"
                className={`${primaryRunClass} rematch-cta-pulse py-3 shadow-lg`}
                onClick={() => void handleOptIn()}
                disabled={optInLoading}
              >
                {primaryInner}
              </button>
            )
          ) : (
            <button
              type="button"
              className={`${primaryRunClass} rematch-cta-pulse py-3 shadow-lg`}
              onClick={openSignIn}
            >
              <span className="text-base font-bold">🔥 Run it back</span>
              <span className="text-xs font-medium text-white/90 mt-0.5">
                Sign in to join
              </span>
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function EndGameScreen({
  roomCode,
  lastGameEndResult,
  rematch,
}: EndGameScreenProps) {
  const { winnerName, winnerNickname, winnerPoints, leaderboard, lastPlace, bestPlay } =
    lastGameEndResult;
  const winnerDisplayName = winnerNickname?.trim() || winnerName;
  const celebrationFired = useRef(false);
  const didScrollToRematchRef = useRef(false);

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

  /* Optional: nudge rematch into view once (helps small viewports) */
  useEffect(() => {
    if (didScrollToRematchRef.current) return;
    didScrollToRematchRef.current = true;
    const t = requestAnimationFrame(() => {
      document
        .getElementById("end-game-rematch")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800 flex flex-col items-center justify-center p-4 sm:p-6 pb-28 md:pb-6">
      <div className="w-full max-w-lg">
        <h1 className="text-page-title text-center text-neutral-900 dark:text-white mb-1">
          Game Over
        </h1>
        <p className="text-center text-body-muted mb-4 sm:mb-5">Room {roomCode}</p>

        <div className="rounded-2xl bg-primary/15 dark:bg-primary/25 border-2 border-primary/40 p-5 sm:p-6 mb-4 text-center shadow-sm">
          <p className="text-sm font-medium text-primary dark:text-primary/90 uppercase tracking-wide mb-2">
            Winner
          </p>
          <p className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white leading-snug min-h-[3.25rem] flex items-center justify-center">
            {winnerLines[wi]}
          </p>
          <p className="text-lg font-semibold text-primary dark:text-primary/90 mt-2">
            {winnerPoints} pts
          </p>
        </div>

        <RematchSection roomCode={roomCode} rematch={rematch} />

        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 shadow-lg dark:shadow-none overflow-hidden mb-5">
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

        <div className="space-y-3 md:space-y-4">
          <p className="text-center text-sm font-medium text-neutral-600 dark:text-neutral-400 px-2">
            {socialLines[si]}
          </p>

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
