"use client";

import { useRouter } from "next/navigation";
import { RoomEvent, useRoomChannel } from "@/lib/ably/useRoomChannel";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/toast";
import { ChatPanel, type ChatMessage } from "./chat-panel";
import { GameTour } from "./game-tour";
import { Hand } from "./hand";
import { InstructionsModal } from "./instructions-modal";
import { PlayerList } from "./player-list";
import { SubmitterPendingBadge } from "./submitter-pending-badge";
import { CardsToDiscardSection } from "./cards-to-discard-section";
import { VotingPanel } from "./voting-panel";
import { getCardDescriptionForDisplay } from "@/lib/game/display";

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
  quarterDiscardDonePlayerIds?: string[] | null;
  suggestEndRoundPlayerIds?: string[] | null;
  canTurnInCards: boolean;
  players: Player[];
  gameState: GameState | null;
}

interface GameBoardProps {
  roomCode: string;
  currentUserId: string;
  initialRoom: Room;
  /** When true, show tour on mount (e.g. coming from lobby after game start). Tour otherwise only triggers on game_started event. */
  showTourOnMount?: boolean;
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

export function GameBoard({
  roomCode,
  currentUserId,
  initialRoom,
  showTourOnMount = false,
}: GameBoardProps) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hand, setHand] = useState<HandCard[]>([]);
  const [handLoading, setHandLoading] = useState(true);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [startTour, setStartTour] = useState(false);
  const [showEndGameModal, setShowEndGameModal] = useState(false);
  const [showResetPointsModal, setShowResetPointsModal] = useState(false);
  const [showEndRoundModal, setShowEndRoundModal] = useState(false);
  const [showEndRoundEarlyModal, setShowEndRoundEarlyModal] = useState(false);
  const [isEndingGame, setIsEndingGame] = useState(false);
  const [isResettingPoints, setIsResettingPoints] = useState(false);
  const [isEndingRound, setIsEndingRound] = useState(false);
  const [isEndingRoundEarly, setIsEndingRoundEarly] = useState(false);
  const [intermissionSecondsLeft, setIntermissionSecondsLeft] = useState<
    number | null
  >(null);
  const [allDoneCountdown, setAllDoneCountdown] = useState<number | null>(null);
  const [isMarkingDone, setIsMarkingDone] = useState(false);
  const [suggestEndRoundBannerDismissed, setSuggestEndRoundBannerDismissed] =
    useState(false);
  const [isSuggestingEndRound, setIsSuggestingEndRound] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showMoreHostControls, setShowMoreHostControls] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState<
    number | null
  >(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pointsAwardedPopup, setPointsAwardedPopup] = useState<{
    points: number;
  } | null>(null);
  const [playersPanelOpen, setPlayersPanelOpen] = useState(false);
  const [votingPanelOpen, setVotingPanelOpen] = useState(false);
  const [votingDismissed, setVotingDismissed] = useState(false);
  const prevSubmissionsToVoteCount = useRef(0);

  const router = useRouter();
  const toast = useToast();
  const isRedirectingToEndGame = useRef(false);

  const fetchRoom = useCallback(async (): Promise<Room | null> => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}`);
      if (response.ok) {
        const roomData = await response.json();
        setRoom(roomData);
        return roomData;
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to fetch room:", error);
    }
    return null;
  }, [roomCode]);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetch(`/api/chat/messages?roomCode=${roomCode}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages ?? []);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to fetch messages:", error);
    }
  }, [roomCode]);

  const fetchHand = useCallback(async () => {
    try {
      const response = await fetch(`/api/game/hand?roomCode=${roomCode}`);
      if (response.ok) {
        const data = await response.json();
        setHand(data.cards || []);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to fetch hand:", error);
    } finally {
      setHandLoading(false);
    }
  }, [roomCode]);

  const fetchSubmissions = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/game/submissions?roomCode=${roomCode}`,
      );
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions || []);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to fetch submissions:", error);
    }
  }, [roomCode]);

  // Fetch initial data
  useEffect(() => {
    fetchHand();
    fetchSubmissions();
  }, [fetchHand, fetchSubmissions]);

  // Tour only on showTourOnMount (from lobby after game start) — never on plain page load/refresh
  useEffect(() => {
    if (!showTourOnMount) return;
    // Clear ?tour=1 from URL so refresh won't trigger again
    if (typeof window !== "undefined" && window.location.search.includes("tour=1")) {
      const url = new URL(window.location.href);
      url.searchParams.delete("tour");
      window.history.replaceState({}, "", url.pathname + (url.search || ""));
    }
    const checkAndStartTour = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          if (!data.profile?.skipTour) setStartTour(true);
        } else {
          setStartTour(true);
        }
      } catch {
        setStartTour(true);
      }
    };
    void checkAndStartTour();
  }, [showTourOnMount]);

  // Derive intermission countdown from room.quarterIntermissionEndsAt
  const endsAt = room.quarterIntermissionEndsAt
    ? new Date(room.quarterIntermissionEndsAt).getTime()
    : null;
  const isQuarterIntermission = !!endsAt && endsAt > Date.now();
  const isHost = room.players.some(
    (p) => p.user.id === currentUserId && p.isHost,
  );

  // Subscribe to game events; fall back to polling when Ably is disconnected
  const { isConnected } = useRoomChannel(
    roomCode,
    (event: RoomEvent, data: Record<string, unknown>) => {
      // If we're redirecting to end-game, ignore all further events (don't start tour, don't fetch)
      if (isRedirectingToEndGame.current) return;
      // When game ends, redirect all players to end-game page (no alert, no tour)
      if (event === "game_ended") {
        isRedirectingToEndGame.current = true;
        router.push(`/game/${roomCode}/end-game`);
        return;
      }
      if (event === "message_sent" && data) {
        const msg = data as {
          id: string;
          message: string;
          createdAt: string;
          sender: {
            id: string;
            nickname?: string | null;
            user: { id: string; name: string };
          };
        };
        setMessages((prev) => [
          ...prev,
          {
            id: msg.id,
            message: msg.message,
            createdAt: msg.createdAt,
            sender: msg.sender,
          },
        ]);
        return;
      }
      if (event === "card_approved" && data) {
        const payload = data as {
          pointsAwarded?: number;
          submittedBy?: { id: string };
        };
        const points = payload.pointsAwarded ?? 0;
        const submitterPlayerId = payload.submittedBy?.id;
        const currentPlayerId = room.players.find(
          (p) => p.user.id === currentUserId,
        )?.id;
        const isRecipient =
          submitterPlayerId &&
          currentPlayerId &&
          submitterPlayerId === currentPlayerId;
        if (points > 0 && isRecipient) {
          setPointsAwardedPopup({ points });
          import("canvas-confetti").then(({ default: confetti }) => {
            confetti({
              particleCount: 50,
              spread: 70,
              origin: { y: 0.75 },
              colors: ["#22c55e", "#16a34a", "#f59e0b", "#eab308"],
            });
          });
          setTimeout(() => setPointsAwardedPopup(null), 2200);
        }
      }
      if (event === "quarter_discard_points_awarded" && data) {
        const payload = data as {
          pointsAwarded?: number;
          submittedBy?: { id: string };
        };
        const points = payload.pointsAwarded ?? 0;
        const recipientPlayerId = payload.submittedBy?.id;
        const currentPlayerId = room.players.find(
          (p) => p.user.id === currentUserId,
        )?.id;
        const isRecipient =
          recipientPlayerId &&
          currentPlayerId &&
          recipientPlayerId === currentPlayerId;
        if (points > 0 && isRecipient) {
          setPointsAwardedPopup({ points });
          import("canvas-confetti").then(({ default: confetti }) => {
            confetti({
              particleCount: 50,
              spread: 70,
              origin: { y: 0.75 },
              colors: ["#22c55e", "#16a34a", "#f59e0b", "#eab308"],
            });
          });
          setTimeout(() => setPointsAwardedPopup(null), 2200);
        }
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
        event === "quarter_discard_points_awarded" ||
        event === "quarter_discard_selection_updated" ||
        event === "quarter_discard_done_updated" ||
        event === "suggest_end_round_updated" ||
        event === "round_reset"
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
              if (process.env.NODE_ENV === "development")
                console.error("Failed to check tour preference:", error);
              setStartTour(true);
            }
          };
          checkAndStartTour();
        }
      }
    },
  );

  // Polling fallback when Ably is disconnected — start after 2s grace, poll every 3s
  useEffect(() => {
    if (isConnected) return;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    const graceTimer = setTimeout(() => {
      const poll = async () => {
        const roomData = await fetchRoom();
        if (roomData?.status === "ended" && !isRedirectingToEndGame.current) {
          isRedirectingToEndGame.current = true;
          router.push(`/game/${roomCode}/end-game`);
          return;
        }
        fetchHand();
        fetchSubmissions();
        fetchMessages();
      };
      void poll();
      pollInterval = setInterval(() => void poll(), 3000);
    }, 2000);
    return () => {
      clearTimeout(graceTimer);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [
    isConnected,
    fetchRoom,
    fetchHand,
    fetchSubmissions,
    fetchMessages,
    roomCode,
    router,
  ]);

  const currentPlayer = room.players.find((p) => p.user.id === currentUserId);
  const rawDone = room.quarterDiscardDonePlayerIds;
  const donePlayerIds = Array.isArray(rawDone)
    ? rawDone
    : rawDone && typeof rawDone === "object"
      ? Object.values(rawDone)
      : [];
  const doneCount = donePlayerIds.length;
  const totalPlayers = room.players.length;
  const allPlayersDone = totalPlayers > 0 && doneCount >= totalPlayers;
  const iAmDone = currentPlayer && donePlayerIds.includes(currentPlayer.id);

  const rawSuggestIds = room.suggestEndRoundPlayerIds;
  const suggestEndRoundIds = Array.isArray(rawSuggestIds)
    ? rawSuggestIds
    : rawSuggestIds && typeof rawSuggestIds === "object"
      ? Object.values(rawSuggestIds)
      : [];
  const suggestEndRoundCount = suggestEndRoundIds.length;
  const nonHostCount = totalPlayers - 1; // exclude host
  const suggestEndRoundPercent =
    nonHostCount > 0 ? (suggestEndRoundCount / nonHostCount) * 100 : 0;
  const iHaveSuggested =
    currentPlayer && suggestEndRoundIds.includes(currentPlayer.id);

  const activeCard = room.gameState?.activeCardInstance;

  // Reset banner dismissed when round ends (intermission starts)
  useEffect(() => {
    if (isQuarterIntermission) {
      setSuggestEndRoundBannerDismissed(false);
    }
  }, [isQuarterIntermission]);

  // When all players click Done, start 5-second countdown. Clear when someone undoes.
  useEffect(() => {
    if (!isQuarterIntermission || !allPlayersDone) {
      setAllDoneCountdown(null);
      return;
    }
    setAllDoneCountdown(5);
  }, [isQuarterIntermission, allPlayersDone]);

  // All-done countdown: when it hits 0, host calls finalize-quarter
  useEffect(() => {
    if (allDoneCountdown == null || allDoneCountdown > 0 || !isHost) return;
    fetch("/api/game/finalize-quarter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode }),
    }).then(() => fetchRoom());
  }, [allDoneCountdown, isHost, roomCode]);

  // Countdown timer for quarter intermission; when it hits 0, only host calls finalize-quarter (avoids duplicate calls from all clients)
  // Skip when all-done countdown is active (that path handles finalize)
  useEffect(() => {
    if (allDoneCountdown != null || !endsAt || endsAt <= Date.now()) {
      if (allDoneCountdown != null) setIntermissionSecondsLeft(null);
      return;
    }
    let finalized = false;
    const update = () => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
      setIntermissionSecondsLeft(left);
      if (left <= 0 && !finalized && isHost) {
        finalized = true;
        fetch("/api/game/finalize-quarter", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomCode }),
        }).then(() => fetchRoom());
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt, roomCode, isHost, allDoneCountdown]);

  // All-done 5-second countdown tick
  useEffect(() => {
    if (allDoneCountdown == null || allDoneCountdown <= 0) return;
    const t = setTimeout(() => setAllDoneCountdown((c) => (c != null && c > 0 ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [allDoneCountdown]);
  const chatUnreadCount = chatOpen
    ? 0
    : lastSeenMessageCount == null
      ? messages.length
      : Math.max(0, messages.length - lastSeenMessageCount);

  const handleSubmitCard = async (cardInstanceIds: string | string[]) => {
    setIsSubmitting(true);
    try {
      // Convert single ID to array if needed
      const ids = Array.isArray(cardInstanceIds)
        ? cardInstanceIds
        : [cardInstanceIds];

      const response = await fetch("/api/game/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, cardInstanceIds: ids }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.addToast(error.error || "Failed to submit card", "error");
      } else {
        // Clear selection and refresh
        setSelectedCardIds([]);
        fetchHand();
        fetchSubmissions();
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to submit card:", error);
      toast.addToast("Failed to submit card", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (
    submissionId: string,
    cardInstanceIds: string[],
    vote: boolean,
  ) => {
    try {
      const response = await fetch("/api/game/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, submissionId, cardInstanceIds, vote }),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.addToast(error.error || "Failed to vote", "error");
      } else {
        // Refresh all data after voting
        fetchSubmissions();
        fetchRoom();
        fetchHand();
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to vote:", error);
      toast.addToast("Failed to vote", "error");
    }
  };

  const handleStartTour = () => {
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
      if (process.env.NODE_ENV === "development")
        console.error("Failed to end game:", error);
      toast.addToast(
        error instanceof Error ? error.message : "Failed to end game",
        "error",
      );
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
      if (process.env.NODE_ENV === "development")
        console.error("Failed to reset points:", error);
      toast.addToast(
        error instanceof Error ? error.message : "Failed to reset points",
        "error",
      );
    } finally {
      setIsResettingPoints(false);
    }
  };

  const handleEndRound = async () => {
    setIsEndingRound(true);
    try {
      const response = await fetch("/api/game/end-quarter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to end round");
      }
      setShowEndRoundModal(false);
      fetchRoom();
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to end round:", error);
      toast.addToast(
        error instanceof Error ? error.message : "Failed to end round",
        "error",
      );
    } finally {
      setIsEndingRound(false);
    }
  };

  const handleSuggestEndRound = async () => {
    setIsSuggestingEndRound(true);
    try {
      const response = await fetch("/api/game/suggest-end-round", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to suggest end round");
      }
      fetchRoom();
      setPlayersPanelOpen(false);
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to suggest end round:", error);
      toast.addToast(
        error instanceof Error ? error.message : "Failed to suggest end round",
        "error",
      );
    } finally {
      setIsSuggestingEndRound(false);
    }
  };

  const handleMarkDone = async () => {
    setIsMarkingDone(true);
    try {
      const response = await fetch("/api/game/quarter-discard-done", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to mark done");
      }
      fetchRoom();
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to mark done:", error);
      toast.addToast(
        error instanceof Error ? error.message : "Failed to mark done",
        "error",
      );
    } finally {
      setIsMarkingDone(false);
    }
  };

  const handleEndRoundEarly = async () => {
    setIsEndingRoundEarly(true);
    try {
      const response = await fetch("/api/game/finalize-quarter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to end intermission");
      }
      setShowEndRoundEarlyModal(false);
      fetchRoom();
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to end intermission:", error);
      toast.addToast(
        error instanceof Error ? error.message : "Failed to end intermission",
        "error",
      );
    } finally {
      setIsEndingRoundEarly(false);
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
      if (process.env.NODE_ENV === "development")
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
      if (process.env.NODE_ENV === "development")
        console.error("Failed to save quarter discard selection:", error);
      alert(
        error instanceof Error ? error.message : "Failed to save selection",
      );
    }
  };

  const handleSendMessage = async (text: string) => {
    const response = await fetch("/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomCode, message: text }),
    });
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || "Failed to send message");
    }
    const data = await response.json();
    if (data.message) {
      setMessages((prev) => [...prev, data.message]);
    }
  };

  const isFootballOrBasketball =
    room.sport === "football" || room.sport === "basketball";
  const showQuarterControls =
    room.allowQuarterClearing && isFootballOrBasketball;

  const roundLabel = room.currentQuarter?.replace(/^Q/, "") ?? null;

  const submissionsToVote = useMemo(
    () =>
      submissions.filter(
        (s) =>
          s.status === "pending" && s.submittedBy.user.id !== currentUserId,
      ),
    [submissions, currentUserId],
  );

  useEffect(() => {
    if (submissionsToVote.length > 0) {
      if (submissionsToVote.length > prevSubmissionsToVoteCount.current) {
        setVotingDismissed(false);
      }
      setVotingPanelOpen(true);
    } else {
      setVotingDismissed(false);
    }
    prevSubmissionsToVoteCount.current = submissionsToVote.length;
  }, [submissionsToVote.length]);

  const myPendingDiscardCount =
    currentPlayer && showQuarterControls && isQuarterIntermission
      ? (
          (room.pendingQuarterDiscardSelections ?? null)?.[currentPlayer.id] ??
          []
        ).length
      : 0;

  return (
    <div className="container mx-auto px-2 py-4 md:p-6 lg:p-4 max-w-6xl min-h-screen bg-background overflow-x-hidden">
      <GameTour startTour={startTour} onTourStart={() => setStartTour(false)} />

      <div className="mb-6">
        <div className="flex items-center justify-center md:justify-start gap-2 mb-2 min-w-0">
          <h1
            className="text-lg sm:text-page-title text-foreground truncate min-w-0"
            title={`Game Room ${room.code}`}
          >
            Game Room {room.code}
          </h1>
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
            className="p-1.5 shrink-0 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            title="Copy invite link"
            aria-label="Copy invite link"
          >
            {linkCopied ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6 text-green-600 dark:text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                />
              </svg>
            )}
          </button>
        </div>
        <div
          data-tour="game-info"
          className="flex flex-wrap items-center justify-between gap-y-4 gap-x-4 text-sm text-neutral-600 dark:text-neutral-400"
        >
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 min-w-0 w-full md:w-auto">
            <span title="Game mode affects the mix of card severities (mild / moderate / severe) in the deck.">
              Mode: {room.mode || "N/A"}
            </span>
            <span>Sport: {room.sport || "N/A"}</span>
            {showQuarterControls && (
              <span>Round: {roundLabel ?? "Not started"}</span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 justify-center md:justify-end w-full md:w-auto">
            <span data-tour="instructions">
              <InstructionsModal onStartTour={handleStartTour} />
            </span>
            {submissionsToVote.length > 0 && (
              <span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setVotingPanelOpen(true);
                    setVotingDismissed(false);
                  }}
                  className="border-amber-500/50 text-amber-700 dark:text-amber-300"
                >
                  Vote ({submissionsToVote.length})
                </Button>
              </span>
            )}
            <span data-tour="players-button" className="lg:hidden">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setPlayersPanelOpen(true)}
                className="relative inline-flex items-center gap-1.5 border-2 border-primary text-primary bg-primary/5 dark:shadow-[0_0_14px_rgba(255,102,0,0.5)] hover:bg-primary/10 dark:hover:shadow-[0_0_18px_rgba(255,102,0,0.6)] dark:[text-shadow:0_0_8px_rgba(255,102,0,0.6)] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary shadow-sm hover:shadow-md whitespace-nowrap"
                aria-label={
                  room.players.length > 0
                    ? `Open players (${room.players.length})`
                    : "Open players"
                }
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0 [filter:drop-shadow(0_0_4px_rgba(255,102,0,0.8))]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <span className="hidden sm:inline">
                  Players{" "}
                  {room.players.length > 0 && `(${room.players.length})`}
                </span>
              </Button>
            </span>
            <span data-tour="chat-button">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setChatOpen(true);
                  setLastSeenMessageCount(messages.length);
                  fetchMessages();
                }}
                aria-label={
                  chatUnreadCount > 0
                    ? `Open chat (${chatUnreadCount} new)`
                    : "Open chat"
                }
                className="relative inline-flex items-center gap-1.5 border-2 border-primary text-primary bg-primary/5 dark:shadow-[0_0_14px_rgba(255,102,0,0.5)] hover:bg-primary/10 dark:hover:shadow-[0_0_18px_rgba(255,102,0,0.6)] dark:[text-shadow:0_0_8px_rgba(255,102,0,0.6)] transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary shadow-sm hover:shadow-md whitespace-nowrap"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 shrink-0 [filter:drop-shadow(0_0_4px_rgba(255,102,0,0.8))]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <span className="hidden sm:inline">Chat</span>
                {chatUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1.5">
                    {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                  </span>
                )}
              </Button>
            </span>
          </div>
        </div>
      </div>

      {pointsAwardedPopup && (
        <div
          className="fixed left-1/2 bottom-[40%] -translate-x-1/2 z-50 pointer-events-none"
          aria-live="polite"
        >
          <div className="points-awarded-popup rounded-xl bg-emerald-600 text-white px-6 py-4 shadow-xl border-2 border-emerald-500/50 text-2xl font-bold">
            +{pointsAwardedPopup.points} pts
          </div>
        </div>
      )}

      <ChatPanel
        roomCode={roomCode}
        messages={messages}
        currentPlayerId={currentPlayer?.id}
        onSendMessage={handleSendMessage}
        isOpen={chatOpen}
        onClose={() => {
          setChatOpen(false);
          setLastSeenMessageCount(messages.length);
        }}
      />

      {/* Voting panel - blocking slide-out (mobile) / modal (desktop) */}
      {votingPanelOpen && submissionsToVote.length > 0 && !votingDismissed && (
        <VotingPanel
          submissions={submissions}
          currentUserId={currentUserId}
          totalPlayers={room.players.length}
          onVote={handleVote}
          onClose={() => {
            setVotingPanelOpen(false);
            setVotingDismissed(true);
          }}
          votingPaused={isQuarterIntermission}
          roomMode={room.mode}
        />
      )}

      {/* Players slide-out panel (mobile/tablet only) */}
      {playersPanelOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-[9000] lg:hidden"
            onClick={() => setPlayersPanelOpen(false)}
            aria-hidden
          />
          <div
            className="fixed top-0 right-0 h-full w-[min(320px,85vw)] bg-surface border-l border-border shadow-xl z-[9001] lg:hidden flex flex-col animate-slide-in-right"
            role="dialog"
            aria-label="Players and host controls"
          >
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <h2 className="text-lg font-bold text-foreground">Players</h2>
              <button
                type="button"
                onClick={() => setPlayersPanelOpen(false)}
                className="p-2 rounded-md text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-surface-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                aria-label="Close players"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {isHost && (
                <div className="p-4 bg-surface-muted rounded-lg border border-border">
                  <h4 className="text-section-title mb-3 text-neutral-700 dark:text-neutral-300">
                    Host Controls
                  </h4>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={room.showPoints}
                        onChange={async (e) => {
                          try {
                            const response = await fetch(
                              `/api/rooms/${roomCode}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  showPoints: e.target.checked,
                                }),
                              },
                            );
                            if (response.ok) {
                              const updatedRoom = await response.json();
                              setRoom(updatedRoom);
                              setPlayersPanelOpen(false);
                            }
                          } catch (err) {
                            if (process.env.NODE_ENV === "development")
                              console.error(
                                "Failed to update showPoints:",
                                err,
                              );
                          }
                        }}
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        Show all players&apos; points
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <Checkbox
                        checked={room.allowJoinInProgress ?? false}
                        onChange={async (e) => {
                          try {
                            const response = await fetch(
                              `/api/rooms/${roomCode}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  allowJoinInProgress: e.target.checked,
                                }),
                              },
                            );
                            if (response.ok) {
                              const updatedRoom = await response.json();
                              setRoom(updatedRoom);
                              setPlayersPanelOpen(false);
                            }
                          } catch (err) {
                            if (process.env.NODE_ENV === "development")
                              console.error(
                                "Failed to update allowJoinInProgress:",
                                err,
                              );
                          }
                        }}
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        Allow new users to join
                      </span>
                    </label>
                    {showQuarterControls && (
                      <>
                        <div className="pt-2 border-t border-border">
                          <Label className="block text-xs font-medium mb-2 text-neutral-600 dark:text-neutral-400">
                            Current Round
                          </Label>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                              {roundLabel ?? "Not started"}
                            </span>
                            {!isQuarterIntermission && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => {
                                    setShowEndRoundModal(true);
                                    setPlayersPanelOpen(false);
                                  }}
                                >
                                  End Round
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(
                                        "/api/game/reset-round",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({ roomCode }),
                                        },
                                      );
                                      if (!response.ok) {
                                        const data = await response.json();
                                        toast.addToast(
                                          data.error || "Failed to reset round",
                                          "error",
                                        );
                                      } else {
                                        setPlayersPanelOpen(false);
                                      }
                                    } catch (error) {
                                      if (
                                        process.env.NODE_ENV === "development"
                                      )
                                        console.error(
                                          "Failed to reset round:",
                                          error,
                                        );
                                      toast.addToast(
                                        "Failed to reset round",
                                        "error",
                                      );
                                    }
                                  }}
                                  title="Reset round count. Next End Round will start Round 1."
                                >
                                  Reset Round
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="pt-2 border-t border-border space-y-2">
                      <Button
                        variant="outline-primary"
                        fullWidth
                        size="sm"
                        onClick={() => {
                          setShowResetPointsModal(true);
                          setPlayersPanelOpen(false);
                        }}
                      >
                        Reset Points
                      </Button>
                      <Button
                        variant="outline-destructive"
                        fullWidth
                        size="sm"
                        onClick={() => {
                          setShowEndGameModal(true);
                          setPlayersPanelOpen(false);
                        }}
                      >
                        End Game
                      </Button>
                    </div>
                    {showQuarterControls && !isQuarterIntermission && (
                      <div className="pt-2 border-t border-border">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">
                          {suggestEndRoundCount} player
                          {suggestEndRoundCount !== 1 ? "s" : ""} want
                          {suggestEndRoundCount === 1 ? "s" : ""} new cards
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {!isHost &&
                showQuarterControls &&
                !isQuarterIntermission &&
                currentPlayer && (
                  <div className="p-4 bg-surface-muted rounded-lg border border-border">
                    <Button
                      type="button"
                      variant={iHaveSuggested ? "secondary" : "outline-primary"}
                      size="sm"
                      fullWidth
                      onClick={handleSuggestEndRound}
                      disabled={isSuggestingEndRound}
                    >
                      {iHaveSuggested
                        ? "Undo suggest end round"
                        : "Suggest end round"}
                    </Button>
                  </div>
                )}
              <div className="bg-surface rounded-lg p-4 border border-border">
                <PlayerList
                  players={room.players}
                  currentUserId={currentUserId}
                  showPoints={room.showPoints}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="grid gap-6 lg:gap-4 lg:grid-cols-[280px_1fr]">
        {/* Left Column - Host Controls (top) & Players — desktop only; on mobile/tablet use Players panel */}
        <div className="hidden lg:block lg:min-w-0 space-y-6">
          {/* Host Controls - at top so always visible with many players */}
          {isHost && (
            <div
              data-tour="host-controls"
              className="p-4 lg:p-3 bg-surface-muted rounded-lg border border-border shadow-sm dark:shadow-none"
            >
              <h4 className="text-section-title mb-3 text-neutral-700 dark:text-neutral-300">
                Host Controls
              </h4>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={room.showPoints}
                    onChange={async (e) => {
                      try {
                        const response = await fetch(`/api/rooms/${roomCode}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            showPoints: e.target.checked,
                          }),
                        });
                        if (response.ok) {
                          const updatedRoom = await response.json();
                          setRoom(updatedRoom);
                        }
                      } catch (error) {
                        if (process.env.NODE_ENV === "development")
                          console.error("Failed to update showPoints:", error);
                      }
                    }}
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Show all players&apos; points
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
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
                        if (process.env.NODE_ENV === "development")
                          console.error(
                            "Failed to update allowJoinInProgress:",
                            error,
                          );
                      }
                    }}
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    Allow new users to join
                  </span>
                </label>
                {showQuarterControls && !isQuarterIntermission && (
                  <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                    <span className="text-sm text-neutral-600 dark:text-neutral-400">
                      {suggestEndRoundCount} player
                      {suggestEndRoundCount !== 1 ? "s" : ""} want
                      {suggestEndRoundCount === 1 ? "s" : ""} new cards
                    </span>
                  </div>
                )}
                <Button
                  type="button"
                  variant="tertiary"
                  size="sm"
                  onClick={() => setShowMoreHostControls((prev) => !prev)}
                  className="text-primary hover:text-primary/90"
                >
                  {showMoreHostControls
                    ? "Hide controls"
                    : "Show more controls"}
                </Button>
                {showMoreHostControls && (
                  <>
                    {showQuarterControls && (
                      <>
                        <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700">
                          <Label className="block text-xs font-medium mb-2 text-neutral-600 dark:text-neutral-400">
                            Current Round
                          </Label>
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                              {roundLabel ?? "Not started"}
                            </span>
                            {!isQuarterIntermission && (
                              <>
                                <Button
                                  type="button"
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={() => setShowEndRoundModal(true)}
                                >
                                  End Round
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline-primary"
                                  size="sm"
                                  onClick={async () => {
                                    try {
                                      const response = await fetch(
                                        "/api/game/reset-round",
                                        {
                                          method: "POST",
                                          headers: {
                                            "Content-Type": "application/json",
                                          },
                                          body: JSON.stringify({ roomCode }),
                                        },
                                      );
                                      if (!response.ok) {
                                        const data = await response.json();
                                        toast.addToast(
                                          data.error || "Failed to reset round",
                                          "error",
                                        );
                                      }
                                    } catch (error) {
                                      if (
                                        process.env.NODE_ENV === "development"
                                      )
                                        console.error(
                                          "Failed to reset round:",
                                          error,
                                        );
                                      toast.addToast(
                                        "Failed to reset round",
                                        "error",
                                      );
                                    }
                                  }}
                                  title='Reset round count. Next "End Round" will start Round 1.'
                                >
                                  Reset Round
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-700 space-y-2">
                      <Button
                        variant="outline-primary"
                        fullWidth
                        onClick={() => setShowResetPointsModal(true)}
                      >
                        Reset Points
                      </Button>
                      <Button
                        variant="outline-destructive"
                        fullWidth
                        onClick={() => setShowEndGameModal(true)}
                      >
                        End Game
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {!isHost &&
            showQuarterControls &&
            !isQuarterIntermission &&
            currentPlayer && (
              <div className="p-4 bg-surface-muted rounded-lg border border-border shadow-sm dark:shadow-none mb-6">
                <Button
                  type="button"
                  variant={iHaveSuggested ? "secondary" : "outline-primary"}
                  size="sm"
                  fullWidth
                  onClick={handleSuggestEndRound}
                  disabled={isSuggestingEndRound}
                >
                  {iHaveSuggested
                    ? "Undo suggest end round"
                    : "Suggest end round"}
                </Button>
              </div>
            )}
          <div
            data-tour="player-list"
            className="bg-surface rounded-lg p-6 lg:p-4 border border-border shadow-sm dark:shadow-none sticky top-6"
          >
            <PlayerList
              players={room.players}
              currentUserId={currentUserId}
              showPoints={room.showPoints}
            />
          </div>
        </div>

        {/* Center Column - Game Area (full width on mobile/tablet) */}
        <div className="lg:min-w-0 space-y-6 overflow-x-hidden">
          {/* Dismissable banner when 50%+ of players want new cards */}
          {isHost &&
            showQuarterControls &&
            !isQuarterIntermission &&
            suggestEndRoundPercent >= 50 &&
            !suggestEndRoundBannerDismissed && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-500/30">
                <span className="font-semibold text-amber-800 dark:text-amber-200">
                  50% of players want new cards. Consider ending the round.
                </span>
                <button
                  type="button"
                  onClick={() => setSuggestEndRoundBannerDismissed(true)}
                  className="p-2 rounded-md text-amber-800/80 hover:text-amber-800 hover:bg-amber-200/50 dark:text-amber-200 dark:hover:bg-amber-800/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary shrink-0"
                  aria-label="Dismiss banner"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            )}
          {/* Round intermission callout — above Pending Submissions/Discard, compact like heading row */}
          {showQuarterControls && isQuarterIntermission && (
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-500/30">
              <span className="font-semibold text-amber-800 dark:text-amber-200">
                {allDoneCountdown != null
                  ? `All players have submitted cards, ending round in ${allDoneCountdown}`
                  : "Round ending — select cards to turn in"}
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                {isHost && allDoneCountdown == null && (
                  <span className="text-sm text-amber-800 dark:text-amber-200">
                    {doneCount}/{totalPlayers} done
                  </span>
                )}
                {myPendingDiscardCount > 0 && allDoneCountdown == null && (
                  <span className="text-sm text-amber-800 dark:text-amber-200">
                    {myPendingDiscardCount} card{myPendingDiscardCount !== 1 ? "s" : ""} to discard
                  </span>
                )}
                {allDoneCountdown == null && (
                  <span
                    className="text-xl font-mono font-bold tabular-nums text-amber-800 dark:text-amber-200 min-w-20 text-center"
                    aria-label="Time remaining"
                  >
                    {intermissionSecondsLeft != null
                      ? `${Math.floor((intermissionSecondsLeft ?? 0) / 60)}:${String((intermissionSecondsLeft ?? 0) % 60).padStart(2, "0")}`
                      : "5:00"}
                  </span>
                )}
                {allDoneCountdown == null && (
                  <Button
                    type="button"
                    variant={iAmDone ? "secondary" : "primary"}
                    size="sm"
                    onClick={handleMarkDone}
                    disabled={isMarkingDone}
                  >
                    {iAmDone ? "Undo" : "Done"}
                  </Button>
                )}
                {isHost && (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setShowEndRoundEarlyModal(true)}
                  >
                    End round early
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Cards to Discard — above Your Hand, separate container (like SubmitterPendingBadge) */}
          {currentPlayer &&
            isQuarterIntermission &&
            showQuarterControls &&
            ((room.pendingQuarterDiscardSelections ?? null)?.[currentPlayer.id] ?? [])
              .length > 0 && (
              <CardsToDiscardSection
                cardInstances={hand.filter((c) =>
                  (
                    (room.pendingQuarterDiscardSelections ?? null)?.[
                      currentPlayer.id
                    ] ?? []
                  ).includes(c.id),
                )}
                onRemove={(cardInstanceId) => {
                  const current =
                    (room.pendingQuarterDiscardSelections ?? null)?.[
                      currentPlayer.id
                    ] ?? [];
                  handleQuarterDiscardSelection(
                    current.filter((id) => id !== cardInstanceId),
                  );
                }}
                roomMode={room.mode}
              />
            )}

          {/* Your hand — front and center */}
          {currentPlayer && (
            <div
              data-tour="your-cards"
              className="space-y-4 min-w-0 overflow-x-hidden"
            >
              {handLoading ? (
                <div className="bg-surface rounded-lg p-3 md:p-6 lg:p-5 border border-border shadow-sm dark:shadow-none flex flex-col min-h-0 max-h-[calc(100vh-12rem)]">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 lg:gap-4 overflow-y-auto min-h-0 flex-1">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="h-[150px] md:h-[120px] lg:h-[220px] rounded-lg bg-neutral-100 dark:bg-neutral-800 animate-pulse"
                        aria-hidden
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <Hand
                  cards={hand}
                  onCardSelect={(cardId) => {
                    setSelectedCardIds((prev) =>
                      prev.includes(cardId)
                        ? prev.filter((id) => id !== cardId)
                        : [...prev, cardId],
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
                    (room.pendingQuarterDiscardSelections ?? null)?.[
                      currentPlayer?.id
                    ] ?? []
                  }
                  roomMode={room.mode}
                  currentUserPoints={currentPlayer.points}
                  submissionDisabled={
                    /* Pause during: host ending round, or all-done 5s countdown */
                    ((isEndingRound || isEndingRoundEarly) && isHost) ||
                    allDoneCountdown != null
                  }
                />
              )}
            </div>
          )}

          {/* Active Card Display */}
          <div
            data-tour="active-card"
            className={
              activeCard
                ? "bg-surface rounded-lg p-4 md:p-6 border border-border shadow-sm dark:shadow-none"
                : "hidden"
            }
          >
            {activeCard ? (
              <>
                <h2 className="text-section-title mb-4">Active Card</h2>
                <div className="p-4 md:p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg border-2 border-primary/30">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">
                        {activeCard.card.title}
                      </h3>
                      <p className="text-neutral-600 dark:text-neutral-400">
                        Drawn by:{" "}
                        {activeCard.drawnBy.nickname ||
                          activeCard.drawnBy.user.name}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          activeCard.card.severity === "severe"
                            ? "bg-red-500/20 text-red-600 dark:text-red-400"
                            : activeCard.card.severity === "moderate"
                              ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                              : "bg-green-500/20 text-green-600 dark:text-green-400"
                        }`}
                      >
                        {activeCard.card.severity}
                      </span>
                      <span className="px-3 py-1 bg-accent/20 text-accent rounded-full text-xs font-medium">
                        {activeCard.card.points} pts
                      </span>
                    </div>
                  </div>
                  <p className="text-lg mb-4">
                    {getCardDescriptionForDisplay(
                      activeCard.card.description,
                      room.mode,
                    )}
                  </p>
                  {activeCard.drawnBy.id === currentPlayer?.id && (
                    <Button
                      variant="outline-primary"
                      fullWidth
                      onClick={() => handleSubmitCard(activeCard.id)}
                      disabled={
                        isQuarterIntermission ||
                        (isHost &&
                          (showEndRoundModal ||
                            showEndRoundEarlyModal ||
                            isEndingRound ||
                            isEndingRoundEarly))
                      }
                      isLoading={isSubmitting}
                    >
                      {isQuarterIntermission
                        ? "Submissions paused (round intermission)"
                        : isHost &&
                            (showEndRoundModal ||
                              showEndRoundEarlyModal ||
                              isEndingRound ||
                              isEndingRoundEarly)
                          ? "Submissions paused (round ending)"
                          : "Submit Card"}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <div className="bg-surface rounded-lg p-6 border border-border shadow-sm dark:shadow-none">
                <h2 className="text-section-title text-neutral-500 dark:text-neutral-400">
                  Active Card
                </h2>
                <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-2">
                  Active cards will appear here when drawn
                </p>
              </div>
            )}
          </div>

          {/* Submitter: compact "Vote pending" badge for own submissions */}
          {!isQuarterIntermission && (
            <SubmitterPendingBadge
              submissions={submissions.filter(
                (s) => s.submittedBy.user.id === currentUserId,
              )}
              roomMode={room.mode}
            />
          )}
        </div>
      </div>

      {/* End Game Confirmation Modal */}
      {showEndGameModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full border border-border shadow-lg dark:shadow-none">
            <h3 className="text-section-title font-bold mb-4">End Game?</h3>
            <p className="text-body-muted mb-6">
              This will end the current game, declare a winner (highest points),
              and start a new game with the same players. All points will be
              reset.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowEndGameModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="outline-destructive"
                fullWidth
                onClick={handleEndGame}
                isLoading={isEndingGame}
              >
                End Game
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Points Confirmation Modal */}
      {showResetPointsModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full border border-border shadow-lg dark:shadow-none">
            <h3 className="text-section-title font-bold mb-4">
              Reset All Points?
            </h3>
            <p className="text-body-muted mb-6">
              This will reset all player points to 0. The game will continue
              with the same state. This is useful if players join late and you
              want to reset for fairness.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowResetPointsModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="outline-primary"
                fullWidth
                onClick={handleResetPoints}
                isLoading={isResettingPoints}
              >
                Reset Points
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* End Round Confirmation Modal */}
      {showEndRoundModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full border border-border shadow-lg dark:shadow-none">
            <h3 className="text-section-title font-bold mb-4">End Round?</h3>
            <p className="text-body-muted mb-6">
              This will end the current round and start the quarter
              intermission. Players will have time to turn in unwanted cards
              before the next round begins.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowEndRoundModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="outline-primary"
                fullWidth
                onClick={handleEndRound}
                isLoading={isEndingRound}
              >
                End Round
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* End Round Early Confirmation Modal */}
      {showEndRoundEarlyModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-lg p-6 max-w-md w-full border border-border shadow-lg dark:shadow-none">
            <h3 className="text-section-title font-bold mb-4">
              End Round Early?
            </h3>
            <p className="text-body-muted mb-6">
              This will end the intermission now. All pending card turn-ins will
              be processed and players will receive new cards. Players who
              haven&apos;t selected cards to turn in will keep their current
              hand.
            </p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setShowEndRoundEarlyModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="outline-primary"
                fullWidth
                onClick={handleEndRoundEarly}
                isLoading={isEndingRoundEarly}
              >
                End Round Early
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
