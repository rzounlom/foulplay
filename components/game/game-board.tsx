"use client";

import { useState, useEffect, useCallback } from "react";
import { useRoomChannel, RoomEvent } from "@/lib/ably/useRoomChannel";
import { PlayerList } from "./player-list";
import { Hand } from "./hand";
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

interface Room {
  id: string;
  code: string;
  status: string;
  mode: string | null;
  sport: string | null;
  showPoints: boolean;
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
  cardInstance: CardInstance;
  submittedBy: {
    id: string;
    user: {
      id: string;
      name: string;
    };
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

  // Subscribe to game events
  useRoomChannel(roomCode, (event: RoomEvent, data) => {
    console.log("Received game event:", event, data);
    if (
      event === "game_started" ||
      event === "card_drawn" ||
      event === "card_submitted" ||
      event === "vote_cast" ||
      event === "submission_approved" ||
      event === "submission_rejected" ||
      event === "turn_changed"
    ) {
      fetchRoom();
      fetchHand();
      fetchSubmissions();
    }
  });

  const currentPlayer = room.players.find((p) => p.userId === currentUserId);
  const isHost = room.players.some(
    (p) => p.userId === currentUserId && p.isHost
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

  const handleVote = async (submissionId: string, vote: boolean) => {
    setIsVoting(true);
    try {
      const response = await fetch("/api/game/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, submissionId, vote }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Failed to vote");
      } else {
        fetchSubmissions();
        fetchRoom();
      }
    } catch (error) {
      console.error("Failed to vote:", error);
      alert("Failed to vote");
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Game Room {room.code}</h1>
        <div className="flex items-center gap-4 text-sm text-neutral-600 dark:text-neutral-400">
          <span>Mode: {room.mode || "N/A"}</span>
          <span>Sport: {room.sport || "N/A"}</span>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Players & Scoreboard */}
        <div className="md:col-span-1">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800 sticky top-6">
            <PlayerList players={room.players} currentUserId={currentUserId} showPoints={room.showPoints} />
            
            {/* Host Controls */}
            {isHost && (
              <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700">
                <h4 className="text-sm font-semibold mb-3 text-neutral-700 dark:text-neutral-300">
                  Host Controls
                </h4>
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
                    className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Show all players&apos; points
                  </span>
                </label>
              </div>
            )}
          </div>
        </div>

        {/* Center Column - Game Area */}
        <div className="md:col-span-2 space-y-6">
          {/* Active Card Display */}
          {activeCard && (
            <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
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
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Card"}
                  </button>
                )}
              </div>
            </div>
          )}


          {/* Pending Submissions */}
          {submissions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold">Pending Submissions</h2>
              {submissions.map((submission) => (
                <VotingUI
                  key={submission.id}
                  submission={submission}
                  currentUserId={currentUserId}
                  totalPlayers={room.players.length}
                  onVote={handleVote}
                />
              ))}
            </div>
          )}

          {/* Player Hand */}
          {currentPlayer && (
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
              selectedCardIds={selectedCardIds}
            />
          )}

        </div>
      </div>
    </div>
  );
}
