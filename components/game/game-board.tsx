"use client";

import { useRouter } from "next/navigation";
import { RoomEvent, useRoomChannel } from "@/lib/ably/useRoomChannel";
import { useCallback, useEffect, useRef, useState } from "react";

import { GameTour } from "./game-tour";
import { Hand } from "./hand";
import { InstructionsModal } from "./instructions-modal";
import { PendingDiscard } from "./pending-discard";
import { PlayerList } from "./player-list";
import { SubmissionPending } from "./submission-pending";
import { VotingUI } from "./voting-ui";

interface Player {
  id: string;
  user: {
    id: string;
    name: string;
  };
  isHost: boolean;
  points: number;
  nickname?: string | null;
}

interface Card {
  id: string;
  title: string;
  description: string;
  severity: string;
  type: string;
  points: number;
}

interface CardInstance {
  id: string;
  card: Card;
  drawnBy: {
    id: string;
    user: {
      id: string;
      name: string;
    };
    nickname?: string | null;
  };
  status: string;
}

interface GameState {
  id: string;
  currentTurnPlayerId: string;
  currentTurnPlayer: {
    id: string;
    user: {
      id: string;
      name: string;
    };
  };
  activeCardInstanceId: string | null;
  activeCardInstance: CardInstance | null;
}

export interface Room {
  id: string;
  code: string;
  status: string;
  mode: string | null;
  sport: string | null;
  showPoints: boolean;
  allowJoinInProgress: boolean;
  handSize: number;
  allowQuarterClearing: boolean;
  currentQuarter: string | null;
  quarterIntermissionEndsAt: string | Date | null;
  pendingQuarterDiscardSelections?: Record<string, string[]> | null;
  canTurnInCards: boolean;
  players: Player[];
  gameState: GameState | null;
}

interface GameBoardProps {
  roomCode: string;
  currentUserId: string;
  initialRoom: Room;
}

interface HandCard {
  id: string;
  card: Card;
  status: string;
}

interface Submission {
  id: string;
  status: string;
  cardInstances: Array<CardInstance>;
  submittedBy: {
    id: string;
    user: {
      id: string;
      name: string;
    };
    nickname?: string | null;
  };
  votes: Array<{
    id: string;
    vote: boolean;
    voter: {
      id: string;
      user: {
        id: string;
        name: string;
      };
    };
  }>;
}

export function GameBoard({ roomCode, currentUserId, initialRoom }: GameBoardProps) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hand, setHand] = useState<HandCard[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [startTour, setStartTour] = useState(false);
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [showResetPointsModal, setShowResetPointsModal] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);
  const [isResettingPoints, setIsResettingPoints] = useState(false);
  const [intermissionSecondsLeft, setIntermissionSecondsLeft] = useState<number | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showMoreHostControls, setShowMoreHostControls] = useState(false);

  const router = useRouter();
  const isRedirectingToEndGame = useRef(false);

  const fetchRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}`);
      if (response.ok) {
        const roomData = await response.json();
        setRoom(roomData);
      }
    } catch (error) {
      console.error("Failed to fetch room:", error);
    }
  };

  const fetchHand = useCallback(async () => {
    try {
      const response = await fetch(`/api/game/hand?roomCode=${roomCode}`);
      if (response.ok) {
        const data = await response.json();
        setHand(data.cards || []);
      }
    } catch (error) {
      console.error("Failed to fetch hand:", error);
    }
  }, [roomCode]);

  const fetchSubmissions = useCallback(async () => {
    try {
      const response = await fetch(`/api/game/submissions?roomCode=${roomCode}`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      console.error("Failed to fetch submissions:", error);
    }
  }, [roomCode]);

  // Fetch initial data
  useEffect(() => {
    fetchHand();
    fetchSubmissions();
  }, [fetchHand, fetchSubmissions]);

  // Derive intermission countdown from room.quarterIntermissionEndsAt
  const endsAt = room.quarterIntermissionEndsAt
    ? new Date(room.quarterIntermissionEndsAt).getTime()
    : null;
  const isQuarterIntermission =
    !!endsAt && endsAt > Date.now();

  // Countdown timer for quarter intermission; when it hits 0, finalize quarter
  useEffect(() => {
    if (!endsAt || endsAt <= Date.now()) {
      setIntermissionSecondsLeft(null);
      return;
    }
    let finalized = false;
    const update = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setIntermissionSecondsLeft(left);
      if (left <= 0 && !finalized) {
        finalized = true;
        fetch("/api/game/finalize-quarter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode }),
        }).then(() => {
          fetchRoom();
        });
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- only re-run when endsAt or roomCode changes; fetchRoom called when timer ends
  }, [endsAt, roomCode]);

  // Subscribe to game events
  useRoomChannel(roomCode, (event: RoomEvent) => {
    console.log("Received game event:", event);
    // If we're redirecting to end-game, ignore all further events (don't start tour, don't fetch)
    if (isRedirectingToEndGame.current) return;
    // When game ends, redirect all players to end-game page (no alert, no tour)
    if (event === "game_ended") {
      isRedirectingToEndGame.current = true;
      router.push(`/game/${roomCode}/end-game`);
      return;
    }
    if (
      event === "game_started" ||
      event === "card_drawn" ||
      event === "card_submitted" ||
      event === "vote_cast" ||
      event === "card_approved" ||
      event === "card_rejected" ||
      event === "submission_approved" ||
      event === "submission_rejected" ||
      event === "turn_changed" ||
      event === "room_settings_updated" ||
      event === "points_reset" ||
      event === "card_discarded" ||
      event === "quarter_advanced" ||
      event === "quarter_ending" ||
      event === "quarter_intermission_ended" ||
      event === "quarter_discard_selection_updated" ||
      event === "round_reset" ||
      event === "turn_in_control_changed"
    ) {
      fetchRoom();
      fetchHand();
      fetchSubmissions();
      
      // Start tour when a new game starts (if user hasn't opted out)
      if (event === "game_started") {
        const checkAndStartTour = async () => {
          try {
            const response = await fetch("/api/user/profile");
            if (response.ok) {
              const data = await response.json();
              if (!data.profile?.skipTour) {
                setStartTour(true);
              }
            } else {
              // If profile fetch fails, start tour anyway (default behavior)
              setStartTour(true);
            }
          } catch (error) {
            // If profile fetch fails, start tour anyway (default behavior)
            console.error("Failed to check tour preference:", error);
            setStartTour(true);
          }
        };
        checkAndStartTour();
      }
    }
  });

  const currentPlayer = room.players.find((p) => p.user.id === currentUserId);
  const isHost = room.players.some(
    (p) => p.user.id === currentUserId && p.isHost
  );
  const activeCard = room.gameState?.activeCardInstance;

  const handleSubmitCard = async (cardInstanceIds: string | string[]) => {
    setIsSubmitting(true);
    try {
      // Convert single ID to array if needed
      const ids = Array.isArray(cardInstanceIds) ? cardInstanceIds : [cardInstanceIds];
      
      const response = await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, cardInstanceIds: ids }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to submit card");
      } else {
        // Clear selection and refresh
        setSelectedCardIds([]);
        fetchHand();
        fetchSubmissions();
      }
    } catch (error) {
      console.error("Failed to submit card:", error);
      alert("Failed to submit card");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (submissionId: string, cardInstanceIds: string[], vote: boolean) => {
    try {
      const response = await fetch("/api/game/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, submissionId, cardInstanceIds, vote }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to vote");
      } else {
        // Refresh all data after voting
        fetchSubmissions();
        fetchRoom();
        fetchHand();
      }
    } catch (error) {
      console.error("Failed to vote:", error);
      alert("Failed to vote");
    }
  };

  const handleStartTour = () => {
    localStorage.removeItem("foulplay-tour-completed");
    setStartTour(true);
    setTimeout(() => setStartTour(false), 100);
  };

  const handleEndGame = async () => {
    setIsEndingGame(true);
    try {
      const response = await fetch("/api/game/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to end game");
      }

      setShowEndGameModal(false);
      router.push(`/game/${roomCode}/end-game`);
    } catch (error) {
      console.error("Failed to end game:", error);
      alert(error instanceof Error ? error.message : "Failed to end game");
    } finally {
      setIsEndingGame(false);
    }
  };

  const handleResetPoints = async () => {
    setIsResettingPoints(true);
    try {
      const response = await fetch("/api/game/reset-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to reset points");
      }

      setShowResetPointsModal(false);
      // Data will be refreshed via Ably events
    } catch (error) {
      console.error("Failed to reset points:", error);
      alert(error instanceof Error ? error.message : "Failed to reset points");
    } finally {
      setIsResettingPoints(false);
    }
  };

  const handleDiscardCards = async (cardInstanceIds: string[]) => {
    try {
      const response = await fetch("/api/game/discard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, cardInstanceIds }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to discard cards");
      }

      setSelectedCardIds([]);
      fetchHand();
    } catch (error) {
      console.error("Failed to discard cards:", error);
      alert(error instanceof Error ? error.message : "Failed to discard cards");
    }
  };

  const handleQuarterDiscardSelection = async (cardInstanceIds: string[]) => {
    try {
      const response = await fetch("/api/game/quarter-discard-selection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, cardInstanceIds }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save selection");
      }

      setSelectedCardIds([]);
      fetchRoom();
    } catch (error) {
      console.error("Failed to save quarter discard selection:", error);
      alert(
        error instanceof Error ? error.message : "Failed to save selection"
      );
    }
  };

  const isFootballOrBasketball =
    room.sport === "football" || room.sport === "basketball";
  const showQuarterControls =
    room.allowQuarterClearing && isFootballOrBasketball;

  const roundLabel =
    room.currentQuarter?.replace(/^Q/, "") ?? null;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <GameTour 
        startTour={startTour}
        onTourStart={() => setStartTour(false)}
      />

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-3xl font-bold">Game Room {room.code}</h1>
          <button
            type="button"
            onClick={async () => {
              const url =
                typeof window !== "undefined"
                  ? `${window.location.origin}/join?code=${roomCode}`
                  : "";
              try {
                await navigator.clipboard.writeText(url);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              } catch {
                // fallback for older browsers
                if (typeof window !== "undefined") {
                  window.prompt("Copy this link to invite players:", url);
                }
              }
            }}
            className="p-1.5 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            title="Copy invite link"
            aria-label="Copy invite link"
          >
            {linkCopied ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </button>
        </div>
        <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
          <span>Mode: {room.mode || "N/A"}</span>
          <span>Sport: {room.sport || "N/A"}</span>
          {showQuarterControls && (
            <span>Round: {roundLabel ?? "Not started"}</span>
          )}
          {submissions.length > 0 && (
            <span>Pending Submissions: {submissions.length}</span>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Host Controls (top) & Players */}
        <div className="md:col-span-1 space-y-6">
          {/* Host Controls - at top so always visible with many players */}
          {isHost && (
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
              <h4 className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300">
                Host Controls
              </h4>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={room.showPoints}
                    onChange={async (e) => {
                      try {
                        const response = await fetch(`/api/rooms/${roomCode}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ showPoints: e.target.checked }),
                        });
                        if (response.ok) {
                          const updatedRoom = await response.json();
                          setRoom(updatedRoom);
                        }
                      } catch (error) {
                        console.error("Failed to update showPoints:", error);
                      }
                    }}
                    className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 cursor-pointer"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Show all players&apos; points
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={room.allowJoinInProgress ?? false}
                    onChange={async (e) => {
                      try {
                        const response = await fetch(`/api/rooms/${roomCode}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            allowJoinInProgress: e.target.checked,
                          }),
                        });
                        if (response.ok) {
                          const updatedRoom = await response.json();
                          setRoom(updatedRoom);
                        }
                      } catch (error) {
                        console.error(
                          "Failed to update allowJoinInProgress:",
                          error
                        );
                      }
                    }}
                    className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 cursor-pointer"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Allow new users to join
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowMoreHostControls((prev) => !prev)}
                  className="text-sm font-medium text-primary hover:text-primary/80 underline cursor-pointer"
                >
                  {showMoreHostControls ? "Hide controls" : "Show more controls"}
                </button>
                {showMoreHostControls && (
                  <>
                    {showQuarterControls && (
                      <>
                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                          <label className="block text-xs font-medium mb-2 text-neutral-600 dark:text-neutral-400">
                            Current Round
                          </label>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                              {roundLabel ?? "Not started"}
                            </span>
                            {!isQuarterIntermission && (
                              <>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch("/api/game/end-quarter", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ roomCode }),
                                      });
                                      if (!response.ok) {
                                        const data = await response.json();
                                        alert(data.error || "Failed to end round");
                                      }
                                    } catch (error) {
                                      console.error("Failed to end round:", error);
                                      alert("Failed to end round");
                                    }
                                  }}
                                  className="px-3 py-1 text-xs bg-primary hover:bg-primary/90 text-white rounded font-medium transition-colors cursor-pointer"
                                >
                                  End Round
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch("/api/game/reset-round", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({ roomCode }),
                                      });
                                      if (!response.ok) {
                                        const data = await response.json();
                                        alert(data.error || "Failed to reset round");
                                      }
                                    } catch (error) {
                                      console.error("Failed to reset round:", error);
                                      alert("Failed to reset round");
                                    }
                                  }}
                                  className="px-3 py-1 text-xs bg-neutral-600 hover:bg-neutral-700 text-white rounded font-medium transition-colors cursor-pointer"
                                  title="Reset round count. Next &quot;End round&quot; will start Round 1."
                                >
                                  Reset round
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={room.canTurnInCards}
                            onChange={async (e) => {
                              try {
                                const response = await fetch("/api/game/turn-in-control", {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ roomCode, canTurnInCards: e.target.checked }),
                                });
                                if (!response.ok) {
                                  const data = await response.json();
                                  alert(data.error || "Failed to update turn-in control");
                                }
                              } catch (error) {
                                console.error("Failed to update turn-in control:", error);
                                alert("Failed to update turn-in control");
                              }
                            }}
                            className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 cursor-pointer"
                          />
                          <span className="text-sm text-neutral-700 dark:text-neutral-300">
                            Allow card turn-in
                          </span>
                        </label>
                      </>
                    )}
                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                      <button
                        onClick={() => setShowResetPointsModal(true)}
                        className="w-full py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
                      >
                        Reset Points
                      </button>
                      <button
                        onClick={() => setShowEndGameModal(true)}
                        className="w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors cursor-pointer mt-2"
                      >
                        End Game
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          <div
            data-tour="player-list"
            className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 sticky top-6"
          >
            <PlayerList players={room.players} currentUserId={currentUserId} showPoints={room.showPoints} />
          </div>
        </div>

        {/* Center Column - Game Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Round intermission callout — above Pending Submissions/Discard, compact like heading row */}
          {showQuarterControls && isQuarterIntermission && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-500/30">
              <span className="font-semibold text-amber-800 dark:text-amber-200">
                Round ending — select cards to turn in
              </span>
              <div className="flex items-center gap-3">
                <span
                  className="text-xl font-mono font-bold tabular-nums text-amber-800 dark:text-amber-200 min-w-20 text-center"
                  aria-label="Time remaining"
                >
                  {intermissionSecondsLeft != null
                    ? `${Math.floor((intermissionSecondsLeft ?? 0) / 60)}:${String((intermissionSecondsLeft ?? 0) % 60).padStart(2, "0")}`
                    : "5:00"}
                </span>
                {isHost && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await fetch("/api/game/finalize-quarter", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ roomCode }),
                        });
                        if (response.ok) {
                          fetchRoom();
                        } else {
                          const data = await response.json();
                          alert(data.error || "Failed to end intermission");
                        }
                      } catch (error) {
                        console.error("Failed to finalize quarter:", error);
                        alert("Failed to end intermission");
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded font-medium transition-colors cursor-pointer"
                  >
                    End round early
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Active Card Display */}
          <div 
            data-tour="active-card"
            className={activeCard ? "bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800" : "hidden"}
          >
            {activeCard ? (
              <>
                <h2 className="text-xl font-semibold mb-4">Active Card</h2>
              <div className="p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border-2 border-primary/30">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{activeCard.card.title}</h3>
                    <p className="text-neutral-600 dark:text-neutral-400">
                      Drawn by: {activeCard.drawnBy.nickname || activeCard.drawnBy.user.name}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      activeCard.card.severity === "severe"
                        ? "bg-red-500/20 text-red-600 dark:text-red-400"
                        : activeCard.card.severity === "moderate"
                        ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                        : "bg-green-500/20 text-green-600 dark:text-green-400"
                    }`}>
                      {activeCard.card.severity}
                    </span>
                    <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-xs font-medium">
                      {activeCard.card.points} pts
                    </span>
                  </div>
                </div>
                <p className="text-lg mb-4">{activeCard.card.description}</p>
                {activeCard.drawnBy.id === currentPlayer?.id && (
                  <button
                    onClick={() => handleSubmitCard(activeCard.id)}
                    disabled={isSubmitting || isQuarterIntermission}
                    className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isQuarterIntermission
                      ? "Submissions paused (round intermission)"
                      : isSubmitting
                        ? "Submitting..."
                        : "Submit Card"}
                  </button>
                )}
              </div>
              </>
            ) : (
              <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
                <h2 className="text-xl font-semibold text-neutral-500 dark:text-neutral-400">
                  Active Card
                </h2>
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-2">
                  Active cards will appear here when drawn
                </p>
              </div>
            )}
          </div>


          {/* Pending Submissions (hidden during round intermission to reduce clutter) */}
          {!isQuarterIntermission && (
          <div data-tour="pending-submissions" className="space-y-4">
            {submissions.length > 0 ? (
              <>
                {(() => {
                  // Group submissions by submitter
                  const submissionsBySubmitter = submissions.reduce((acc, submission) => {
                    const submitterId = submission.submittedBy.user.id;
                    if (!acc[submitterId]) {
                      acc[submitterId] = [];
                    }
                    acc[submitterId].push(submission);
                    return acc;
                  }, {} as Record<string, typeof submissions>);

                  return Object.entries(submissionsBySubmitter).map(([submitterId, submitterSubmissions]) => {
                    const isCurrentUser = submitterId === currentUserId;
                    
                    if (isCurrentUser) {
                      // Show pending view for submitter (one submission can have multiple cards)
                      return submitterSubmissions.map((submission) => (
                        <SubmissionPending
                          key={submission.id}
                          submission={submission}
                          totalPlayers={room.players.length}
                        />
                      ));
                    } else {
                      // Show voting UI for other players
                      return submitterSubmissions.map((submission) => (
                        <VotingUI
                          key={submission.id}
                          submission={submission}
                          currentUserId={currentUserId}
                          totalPlayers={room.players.length}
                          onVote={handleVote}
                          votingPaused={isQuarterIntermission}
                        />
                      ));
                    }
                  });
                })()}
              </>
            ) : (
              <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
                <h2 className="text-xl font-semibold text-neutral-500 dark:text-neutral-400">
                  Pending Submissions
                </h2>
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-2">
                  Submissions will appear here when players submit cards
                </p>
              </div>
            )}
          </div>
          )}

          {/* Pending Discard (round intermission only) - same pattern as Pending Submissions */}
          {currentPlayer && isQuarterIntermission && showQuarterControls && (
            <div className="space-y-4">
              <PendingDiscard
                cardInstances={hand.filter((c) =>
                  ((room.pendingQuarterDiscardSelections ?? null)?.[currentPlayer.id] ?? []).includes(c.id)
                )}
                onRemove={(cardInstanceId) => {
                  const current = (room.pendingQuarterDiscardSelections ?? null)?.[currentPlayer.id] ?? [];
                  handleQuarterDiscardSelection(current.filter((id) => id !== cardInstanceId));
                }}
                intermissionSecondsLeft={intermissionSecondsLeft}
              />
            </div>
          )}

          {/* Player Hand */}
          {currentPlayer && (
            <div data-tour="your-cards" className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">Your Cards</h2>
                <div data-tour="instructions">
                  <InstructionsModal onStartTour={handleStartTour} />
                </div>
              </div>
              <Hand
                cards={hand}
                onCardSelect={(cardId) => {
                  setSelectedCardIds((prev) => 
                    prev.includes(cardId) 
                      ? prev.filter(id => id !== cardId)
                      : [...prev, cardId]
                  );
                }}
                onCardSubmit={handleSubmitCard}
                onCardDiscard={handleDiscardCards}
                onQuarterDiscardSelection={handleQuarterDiscardSelection}
                selectedCardIds={selectedCardIds}
                handSize={room.handSize || 5}
                allowQuarterClearing={room.allowQuarterClearing}
                currentQuarter={room.currentQuarter}
                canTurnInCards={room.canTurnInCards}
                isQuarterIntermission={isQuarterIntermission}
                intermissionSecondsLeft={intermissionSecondsLeft}
                myQuarterSelectionIds={
                  (room.pendingQuarterDiscardSelections ?? null)?.[currentPlayer?.id] ?? []
                }
              />
            </div>
          )}

        </div>
      </div>

      {/* End Game Confirmation Modal */}
      {showEndGameModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full border border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xl font-bold mb-4">End Game?</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              This will end the current game, declare a winner (highest points), and start a new game with the same players. All points will be reset.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndGameModal(false)}
                className="flex-1 py-2 px-4 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg font-medium hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleEndGame}
                disabled={isEndingGame}
                className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isEndingGame ? "Ending..." : "End Game"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Points Confirmation Modal */}
      {showResetPointsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 max-w-md w-full border border-neutral-200 dark:border-neutral-800">
            <h3 className="text-xl font-bold mb-4">Reset All Points?</h3>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              This will reset all player points to 0. The game will continue with the same state. This is useful if players join late and you want to reset for fairness.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowResetPointsModal(false)}
                className="flex-1 py-2 px-4 bg-neutral-200 dark:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg font-medium hover:bg-neutral-300 dark:hover:bg-neutral-600 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleResetPoints}
                disabled={isResettingPoints}
                className="flex-1 py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isResettingPoints ? "Resetting..." : "Reset Points"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
