"use client";

import { useRouter } from "next/navigation";
import { RoomEvent, useRoomChannel } from "@/lib/ably/useRoomChannel";
import { useRoomState } from "@/lib/hooks/useRoomState";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const FOULPLAY_HAND_HIGHLIGHT_SESSION_KEY =
  "foulplay-hand-highlight-dismissed";

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
import { ShareModal } from "./share-modal";
import {
  getCardDescriptionForDisplay,
  isNonDrinkingMode,
  formatPenaltyReminder,
  formatPenaltyPartForCombined,
  combinePenalties,
} from "@/lib/game/display";
import { useScreenWakeLock } from "@/lib/hooks/useScreenWakeLock";

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
  /** Initial room for first paint (optional). useRoomState snapshot is the authoritative source. */
  initialRoom?: Room;
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

/** Convert RoomSnapshot to Room shape for game-board compatibility */
function snapshotToRoom(snapshot: {
  roomId: string;
  roomCode: string;
  version?: number;
  status: string;
  mode: string | null;
  sport: string | null;
  showPoints: boolean;
  allowJoinInProgress?: boolean;
  allowQuarterClearing: boolean;
  canTurnInCards?: boolean;
  currentQuarter: string | null;
  quarterIntermissionEndsAt: string | Date | null;
  pendingQuarterDiscardSelections?: Record<string, string[]> | null;
  quarterDiscardDonePlayerIds?: string[] | null;
  suggestEndRoundPlayerIds?: string[] | null;
  handSize?: number;
  players: Array<{ id: string; userId: string; points: number; isHost: boolean; nickname?: string | null; user: { id: string; name: string } }>;
  currentTurnPlayerId: string | null;
  activeCardInstance: unknown;
}): Room {
  return {
    id: snapshot.roomId,
    code: snapshot.roomCode,
    status: snapshot.status,
    mode: snapshot.mode,
    sport: snapshot.sport,
    showPoints: snapshot.showPoints,
    allowJoinInProgress: snapshot.allowJoinInProgress ?? false,
    handSize: snapshot.handSize ?? 6,
    allowQuarterClearing: snapshot.allowQuarterClearing,
    currentQuarter: snapshot.currentQuarter,
    quarterIntermissionEndsAt: snapshot.quarterIntermissionEndsAt,
    pendingQuarterDiscardSelections: snapshot.pendingQuarterDiscardSelections,
    quarterDiscardDonePlayerIds: snapshot.quarterDiscardDonePlayerIds,
    suggestEndRoundPlayerIds: snapshot.suggestEndRoundPlayerIds,
    canTurnInCards: snapshot.canTurnInCards ?? true,
    players: snapshot.players.map((p) => ({
      ...p,
      user: p.user,
      roomId: snapshot.roomId,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
    gameState: snapshot.currentTurnPlayerId
      ? {
          id: "gs",
          currentTurnPlayerId: snapshot.currentTurnPlayerId,
          currentTurnPlayer: { id: snapshot.currentTurnPlayerId, user: { id: "", name: "" } },
          activeCardInstanceId: (snapshot.activeCardInstance as { id?: string })?.id ?? null,
          activeCardInstance: snapshot.activeCardInstance as CardInstance | null,
        }
      : null,
  };
}

export function GameBoard({
  roomCode,
  currentUserId,
  initialRoom,
  showTourOnMount = false,
}: GameBoardProps) {
  const HIDDEN_DISCONNECT_MS = 15 * 60 * 1000;
  const IDLE_DISCONNECT_MS = 60 * 60 * 1000;

  const [shouldConnect, setShouldConnect] = useState(true);
  const lastInteractionAtRef = useRef(Date.now());
  const tabHiddenSinceRef = useRef<number | null>(null);

  const {
    snapshot,
    isLoading: snapshotLoading,
    resyncRoomSnapshot,
    isStateChannelConnected,
  } = useRoomState(roomCode, currentUserId, shouldConnect);

  const resyncRef = useRef(resyncRoomSnapshot);
  resyncRef.current = resyncRoomSnapshot;

  // Track tab visibility for hidden-tab disconnect
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        tabHiddenSinceRef.current = null;
        lastInteractionAtRef.current = Date.now();
      } else {
        tabHiddenSinceRef.current = Date.now();
      }
    };
    if (document.hidden) tabHiddenSinceRef.current = Date.now();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () =>
      document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  // Interaction handlers: update last interaction, reconnect + resync when idle-disconnected
  useEffect(() => {
    const onInteraction = () => {
      lastInteractionAtRef.current = Date.now();
      setShouldConnect((prev) => {
        if (!prev) {
          resyncRef.current();
          return true;
        }
        return prev;
      });
    };
    document.addEventListener("pointerdown", onInteraction);
    document.addEventListener("keydown", onInteraction);
    document.addEventListener("touchstart", onInteraction);
    return () => {
      document.removeEventListener("pointerdown", onInteraction);
      document.removeEventListener("keydown", onInteraction);
      document.removeEventListener("touchstart", onInteraction);
    };
  }, []);

  // Idle check: disconnect after hidden 15min or visible idle 60min
  useEffect(() => {
    const check = () => {
      setShouldConnect((prev) => {
        if (!prev) return prev;
        const now = Date.now();
        if (document.hidden) {
          const hiddenSince = tabHiddenSinceRef.current;
          if (
            hiddenSince !== null &&
            now - hiddenSince >= HIDDEN_DISCONNECT_MS
          ) {
            return false;
          }
        } else {
          if (now - lastInteractionAtRef.current >= IDLE_DISCONNECT_MS) {
            return false;
          }
        }
        return prev;
      });
    };
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  const room = useMemo(() => {
    if (snapshot) return snapshotToRoom(snapshot);
    if (initialRoom) return initialRoom;
    return null;
  }, [snapshot, initialRoom]);

  const hand = useMemo(
    () =>
      (snapshot?.hand ?? []).map((c) => ({
        id: c.id,
        card: c.card as Card,
        status: c.status,
      })) as HandCard[],
    [snapshot?.hand]
  );

  const submissions = useMemo(
    () => (snapshot?.submissions ?? []) as Submission[],
    [snapshot?.submissions]
  );

  const myPendingSubmission = useMemo(
    () =>
      submissions.find(
        (s) =>
          s.status === "pending" &&
          s.submittedBy?.user?.id === currentUserId
      ),
    [submissions, currentUserId]
  );
  const hasPendingSubmission = !!myPendingSubmission;
  const pendingSubmissionAutoAcceptAt =
    (myPendingSubmission as { autoAcceptAt?: string } | undefined)
      ?.autoAcceptAt ?? null;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const handLoading = snapshotLoading;
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);
  const [startTour, setStartTour] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [gameplayGuidanceEnabled, setGameplayGuidanceEnabled] =
    useState(false);
  const tourEverActiveRef = useRef(false);
  const [handHighlightDismissed, setHandHighlightDismissed] = useState(false);
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
  const [showHostDeclinedBanner, setShowHostDeclinedBanner] = useState(false);
  const [isSuggestingEndRound, setIsSuggestingEndRound] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [showMoreHostControls, setShowMoreHostControls] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState<
    number | null
  >(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pointsAwardedPopup, setPointsAwardedPopup] = useState<{
    points: number;
  } | null>(null);
  const [penaltyReminderPopup, setPenaltyReminderPopup] = useState<string | null>(
    null
  );
  const [cardsRejectedPopup, setCardsRejectedPopup] = useState<{
    cardCount: number;
  } | null>(null);
  const [playersPanelOpen, setPlayersPanelOpen] = useState(false);
  const [votingPanelOpen, setVotingPanelOpen] = useState(false);
  const [votingDismissed, setVotingDismissed] = useState(false);
  const prevSubmissionsToVoteCount = useRef(0);
  const roomRef = useRef(room);

  const router = useRouter();
  const toast = useToast();
  const isRedirectingToEndGame = useRef(false);

  // Keep screen awake during gameplay (mobile-friendly)
  useScreenWakeLock(true);

  // Keep roomRef in sync for event handlers (avoids stale closures on rapid events)
  roomRef.current = room;

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

  // Inline gameplay guidance: enable when tour is skipped in profile, after tour ends, or if tour never runs.
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/user/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.profile?.skipTour) return;
        setGameplayGuidanceEnabled(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (tourActive) tourEverActiveRef.current = true;
  }, [tourActive]);

  useEffect(() => {
    if (!tourActive && tourEverActiveRef.current) {
      setGameplayGuidanceEnabled(true);
    }
  }, [tourActive]);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!tourEverActiveRef.current) setGameplayGuidanceEnabled(true);
    }, 15_000);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHandHighlightDismissed(
      sessionStorage.getItem(FOULPLAY_HAND_HIGHLIGHT_SESSION_KEY) === "1",
    );
  }, []);

  useEffect(() => {
    if (handHighlightDismissed || selectedCardIds.length === 0) return;
    sessionStorage.setItem(FOULPLAY_HAND_HIGHLIGHT_SESSION_KEY, "1");
    setHandHighlightDismissed(true);
  }, [selectedCardIds.length, handHighlightDismissed]);

  // Derive intermission countdown from room.quarterIntermissionEndsAt
  const endsAt = room?.quarterIntermissionEndsAt
    ? new Date(room.quarterIntermissionEndsAt).getTime()
    : null;
  const isQuarterIntermission = !!endsAt && endsAt > Date.now();
  const isHost = (room?.players ?? []).some(
    (p) => p.user.id === currentUserId && p.isHost,
  );

  // Subscribe to game events; fall back to polling when Ably is disconnected
  useRoomChannel(
    roomCode,
    (event: RoomEvent, data: Record<string, unknown>) => {
      // If we're redirecting to end-game, ignore all further events (don't start tour, don't fetch)
      if (isRedirectingToEndGame.current) return;
      // When game ends, redirect all players to end-game page (no alert, no tour)
      if (event === "game_ended") {
        isRedirectingToEndGame.current = true;
        // Auto-disable tour for users who have played a game
        fetch("/api/user/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skipTour: true }),
        }).catch(() => {});
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
          cards?: Array<{ description: string }>;
        };
        const points = payload.pointsAwarded ?? 0;
        const submitterPlayerId = payload.submittedBy?.id;
        const r = roomRef.current;
        if (!r) return;
        const currentPlayerId = r.players.find(
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
          // After points animation, show drink penalty reminder (skip in non-drinking mode)
          if (
            !isNonDrinkingMode(r.mode) &&
            payload.cards &&
            payload.cards.length > 0
          ) {
            const penalties = payload.cards.map((c) =>
              getCardDescriptionForDisplay(c.description, r.mode),
            );
            const combined = combinePenalties(penalties);
            const penaltyText =
              combined.length === 1
                ? formatPenaltyReminder(combined[0])
                : `Don't forget to ${combined.map(formatPenaltyPartForCombined).join(" AND ")}!`;
            setTimeout(() => {
              setPenaltyReminderPopup(penaltyText);
              setTimeout(() => setPenaltyReminderPopup(null), 3500);
            }, 2200);
          }
        }
      }
      if (event === "quarter_discard_points_awarded" && data) {
        const payload = data as {
          pointsAwarded?: number;
          submittedBy?: { id: string };
          cards?: Array<{ description: string }>;
        };
        const points = payload.pointsAwarded ?? 0;
        const recipientPlayerId = payload.submittedBy?.id;
        const r2 = roomRef.current;
        if (!r2) return;
        const currentPlayerId = r2.players.find(
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
          // After points animation, show drink penalty reminder (skip in non-drinking mode)
          if (
            !isNonDrinkingMode(r2.mode) &&
            payload.cards &&
            payload.cards.length > 0
          ) {
            const penalties = payload.cards.map((c) =>
              getCardDescriptionForDisplay(c.description, r2.mode),
            );
            const combined = combinePenalties(penalties);
            const penaltyText =
              combined.length === 1
                ? formatPenaltyReminder(combined[0])
                : `Don't forget to ${combined.map(formatPenaltyPartForCombined).join(" AND ")}!`;
            setTimeout(() => {
              setPenaltyReminderPopup(penaltyText);
              setTimeout(() => setPenaltyReminderPopup(null), 3500);
            }, 2200);
          }
        }
      }
      if (event === "card_rejected" && data) {
        const payload = data as {
          submittedBy?: { id: string };
          cardCount?: number;
        };
        const submitterPlayerId = payload.submittedBy?.id;
        const r3 = roomRef.current;
        if (!r3) return;
        const currentPlayerId = r3.players.find(
          (p) => p.user.id === currentUserId,
        )?.id;
        const isSubmitter =
          submitterPlayerId &&
          currentPlayerId &&
          submitterPlayerId === currentPlayerId;
        const cardCount = payload.cardCount ?? 1;
        if (isSubmitter && cardCount > 0) {
          setCardsRejectedPopup({ cardCount });
          setTimeout(() => setCardsRejectedPopup(null), 2200);
        }
      }
      // Events with state channel equivalents: no resync — useRoomState patches from room:{roomCode}:state
      const stateChannelHandled = [
        "card_submitted",
        "vote_cast",
        "card_approved",
        "card_rejected",
        "submission_approved",
        "submission_rejected",
        "turn_changed",
      ];
      if (stateChannelHandled.includes(event)) {
        // UI popups (card_approved, card_rejected) handled above; state patching via useRoomState
      } else if (
        event === "game_started" ||
        event === "card_drawn" ||
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
        event === "suggest_end_round_declined" ||
        event === "round_reset"
      ) {
        if (event === "suggest_end_round_declined" && data) {
          const payload = data as { declinedPlayerIds?: string[] };
          const declinedIds = payload.declinedPlayerIds ?? [];
          const r4 = roomRef.current;
          const currentPlayerId = r4?.players.find(
            (p) => p.user.id === currentUserId
          )?.id;
          if (
            currentPlayerId &&
            declinedIds.includes(currentPlayerId)
          ) {
            setShowHostDeclinedBanner(true);
          }
        }
        if (event === "suggest_end_round_updated") {
          setSuggestEndRoundBannerDismissed(false);
        }
        resyncRoomSnapshot();

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
    shouldConnect,
  );

  // Polling fallback when state channel is disconnected — start after 2s grace, poll every 3s
  // Suppress polling when idle-disconnected (shouldConnect === false)
  useEffect(() => {
    if (isStateChannelConnected || !shouldConnect) return;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    const graceTimer = setTimeout(() => {
      const poll = async () => {
        const data = await resyncRoomSnapshot();
        if (data?.status === "ended" && !isRedirectingToEndGame.current) {
          isRedirectingToEndGame.current = true;
          router.push(`/game/${roomCode}/end-game`);
          return;
        }
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
    isStateChannelConnected,
    shouldConnect,
    resyncRoomSnapshot,
    fetchMessages,
    roomCode,
    router,
  ]);

  // Derive values before early return (hooks must run unconditionally)
  const currentPlayer = room?.players?.find((p) => p.user.id === currentUserId);
  const rawDone = room?.quarterDiscardDonePlayerIds;
  const donePlayerIds = Array.isArray(rawDone)
    ? rawDone
    : rawDone && typeof rawDone === "object"
      ? Object.values(rawDone)
      : [];
  const doneCount = donePlayerIds.length;
  const totalPlayers = room?.players?.length ?? 0;
  const allPlayersDone = totalPlayers > 0 && doneCount >= totalPlayers;
  const iAmDone = currentPlayer && donePlayerIds.includes(currentPlayer.id);

  const rawSuggestIds = room?.suggestEndRoundPlayerIds;
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

  const activeCard = room?.gameState?.activeCardInstance;

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
    }).then(() => resyncRoomSnapshot()); // Event will also trigger resync; this ensures immediate feedback
  }, [allDoneCountdown, isHost, roomCode, resyncRoomSnapshot]);

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
        }).then(() => resyncRoomSnapshot()); // Event will also trigger resync
      }
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endsAt, roomCode, isHost, allDoneCountdown, resyncRoomSnapshot]);

  // All-done 5-second countdown tick
  useEffect(() => {
    if (allDoneCountdown == null || allDoneCountdown <= 0) return;
    const t = setTimeout(() => setAllDoneCountdown((c) => (c != null && c > 0 ? c - 1 : null)), 1000);
    return () => clearTimeout(t);
  }, [allDoneCountdown]);

  const submissionsToVote = useMemo(
    () =>
      submissions.filter(
        (s) =>
          s.status === "pending" &&
          s.submittedBy?.user?.id !== currentUserId,
      ),
    [submissions, currentUserId],
  );

  const hasSubmittedAtLeastOnce = useMemo(
    () =>
      submissions.some(
        (s) => s.submittedBy?.user?.id === currentUserId,
      ),
    [submissions, currentUserId],
  );

  const gameplayGuidanceDynamicText = useMemo(() => {
    if (submissionsToVote.length > 0) return "Vote on this play";
    if (hasPendingSubmission) return "Waiting for votes…";
    if (isQuarterIntermission) return "Waiting for something to happen…";
    if (!hasSubmittedAtLeastOnce)
      return "Pick a card and play it when it happens";
    return "Waiting for something to happen…";
  }, [
    submissionsToVote.length,
    hasPendingSubmission,
    isQuarterIntermission,
    hasSubmittedAtLeastOnce,
  ]);

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

  if (!room) {
    return (
      <div className="container mx-auto px-4 py-8 text-center text-neutral-600 dark:text-neutral-400">
        Loading game…
      </div>
    );
  }
  const chatUnreadCount = chatOpen
    ? 0
    : lastSeenMessageCount == null
      ? messages.length
      : Math.max(0, messages.length - lastSeenMessageCount);

  const showGameplayGuidance = gameplayGuidanceEnabled && !tourActive;
  const showHandHighlight =
    showGameplayGuidance && !!currentPlayer && !handHighlightDismissed;

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
        // Clear selection; state updates via useRoomState (submission.created event)
        setSelectedCardIds([]);
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
      }
      // State updates via useRoomState (submission.vote_cast / submission.accepted)
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
      // State updates via legacy channel event (quarter_advanced)
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
      setPlayersPanelOpen(false);
      // State updates via legacy channel event (suggest_end_round_updated)
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
      // State updates via legacy channel event (quarter_discard_done_updated)
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
      // State updates via legacy channel event (quarter_intermission_ended)
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
      // State updates via legacy channel event (card_discarded)
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
      // State updates via legacy channel event (quarter_discard_selection_updated)
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
    // Don't add message here — we receive it via Ably message_sent event.
    // Adding from both API response and Ably caused sender to see their message twice.
  };

  const isFootballOrBasketball =
    room.sport === "football" || room.sport === "basketball";
  const showQuarterControls =
    room.allowQuarterClearing && isFootballOrBasketball;

  const roundLabel = room.currentQuarter?.replace(/^Q/, "") ?? null;

  const myPendingDiscardCount =
    currentPlayer && showQuarterControls && isQuarterIntermission
      ? (
          (room.pendingQuarterDiscardSelections ?? null)?.[currentPlayer.id] ??
          []
        ).length
      : 0;

  return (
    <div className="container mx-auto px-2 py-4 md:p-6 lg:p-4 max-w-6xl min-h-screen bg-background overflow-x-hidden">
      <GameTour
        startTour={startTour}
        onTourStart={() => setStartTour(false)}
        onTourActiveChange={setTourActive}
      />

      {!shouldConnect && (
        <div
          role="status"
          className="sticky top-0 z-40 bg-amber-100 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 px-4 py-2 text-center text-sm"
        >
          Disconnected due to inactivity. Click anywhere to reconnect.
        </div>
      )}

      <div className="sticky top-0 z-30 bg-background pb-6">
        <div className="flex items-center justify-center md:justify-start gap-2 mb-2 min-w-0">
          <h1
            className="text-lg sm:text-page-title text-foreground truncate min-w-0"
            title={`Game Room ${room.code}`}
          >
            Game Room {room.code}
          </h1>
          <button
            type="button"
            onClick={() => setShareModalOpen(true)}
            className="p-1.5 shrink-0 rounded-md text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:text-neutral-200 dark:hover:bg-neutral-800 transition-colors duration-200 cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            title="Share invite link"
            aria-label="Share invite link"
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
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
          <ShareModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            url={`${typeof window !== "undefined" ? window.location.origin : ""}/join?code=${roomCode}`}
            title="Share invite link"
            shareText={`Join my FoulPlay game! Room ${roomCode}`}
          />
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

        {showGameplayGuidance && (
          <div
            className="mt-3 pt-3 border-t border-border/60 space-y-1.5"
            aria-live="polite"
          >
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 text-center md:text-left">
              Play cards when events happen. Get votes. Score points.
            </p>
            <p className="text-sm font-medium text-foreground text-center md:text-left">
              {gameplayGuidanceDynamicText}
            </p>
            <p className="text-[11px] sm:text-xs text-neutral-400 dark:text-neutral-500 italic text-center md:text-left">
              The crazier the play, the more votes you get
            </p>
          </div>
        )}
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

      {cardsRejectedPopup && (
        <div
          className="fixed left-1/2 bottom-[40%] -translate-x-1/2 z-50 pointer-events-none"
          aria-live="polite"
        >
          <div className="cards-rejected-popup rounded-xl bg-red-600 text-white px-6 py-4 shadow-xl border-2 border-red-500/50 text-xl font-bold text-center max-w-[90vw]">
            {cardsRejectedPopup.cardCount === 1
              ? "Card rejected"
              : `${cardsRejectedPopup.cardCount} cards rejected`}
          </div>
        </div>
      )}

      {penaltyReminderPopup && (
        <div
          className="fixed left-1/2 bottom-[40%] -translate-x-1/2 z-50 pointer-events-none"
          aria-live="polite"
        >
          <div className="penalty-reminder-popup rounded-xl bg-amber-600 text-white px-6 py-4 shadow-xl border-2 border-amber-500/50 text-lg font-bold text-center max-w-[90vw]">
            {penaltyReminderPopup}
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
          roomCode={roomCode}
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
                            await fetch(
                              `/api/rooms/${roomCode}`,
                              {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  showPoints: e.target.checked,
                                }),
                              },
                            );
                            // State updates via room_settings_updated event
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
                            await fetch(`/api/rooms/${roomCode}`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                allowJoinInProgress: e.target.checked,
                              }),
                            });
                            // State updates via room_settings_updated event
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
                          // State updates via room_settings_updated event
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
                          // State updates via room_settings_updated event
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
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline-primary"
                    size="sm"
                    onClick={() => setShowEndRoundModal(true)}
                  >
                    End Round
                  </Button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          "/api/game/decline-suggest-end-round",
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({ roomCode }),
                          }
                        );
                        if (response.ok) {
                          setSuggestEndRoundBannerDismissed(true);
                          // State updates via suggest_end_round_declined event
                        } else {
                          const data = await response.json();
                          toast.addToast(
                            data.error || "Failed to dismiss",
                            "error"
                          );
                        }
                      } catch (error) {
                        if (
                          process.env.NODE_ENV === "development"
                        )
                          console.error(
                            "Failed to decline suggest end round:",
                            error
                          );
                        toast.addToast(
                          "Failed to dismiss",
                          "error"
                        );
                      }
                    }}
                    className="p-2 rounded-md text-amber-800/80 hover:text-amber-800 hover:bg-amber-200/50 dark:text-amber-200 dark:hover:bg-amber-800/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
              </div>
            )}
          {/* Banner for non-host users when host declined their suggest end round */}
          {!isHost &&
            showQuarterControls &&
            !isQuarterIntermission &&
            showHostDeclinedBanner && (
              <div className="flex items-center justify-between gap-3 p-3 rounded-lg border-2 border-amber-500/50 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-500/30">
                <span className="font-semibold text-amber-800 dark:text-amber-200">
                  The host has decided not to end the round.
                </span>
                <button
                  type="button"
                  onClick={() => setShowHostDeclinedBanner(false)}
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

          {/* Your hand — front and center */}
          {currentPlayer && (
            <div
              data-tour="your-cards"
              className={`space-y-4 min-w-0 overflow-x-hidden rounded-xl ${
                showHandHighlight
                  ? "ring-2 ring-primary/45 shadow-[0_0_28px_rgba(255,102,0,0.22)] motion-safe:transition-[box-shadow,ring-color] motion-reduce:shadow-none motion-reduce:ring-primary/35 p-1 -m-1"
                  : ""
              }`}
            >
              {handLoading ? (
                <div className="bg-surface rounded-lg p-3 md:p-6 lg:p-5 border border-border shadow-sm dark:shadow-none flex flex-col min-h-0 max-h-[calc(100vh-12rem)]">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3 lg:gap-4 overflow-y-auto min-h-0 flex-1">
                    {Array.from({ length: room?.handSize ?? 6 }, (_, i) => i + 1).map((i) => (
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
                  handSize={room.handSize || 6}
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
                    /* Pause during: card submission in progress, host ending round, or all-done 5s countdown */
                    isSubmitting ||
                    ((isEndingRound || isEndingRoundEarly) && isHost) ||
                    allDoneCountdown != null
                  }
                  hasPendingSubmission={hasPendingSubmission}
                  pendingSubmissionAutoAcceptAt={pendingSubmissionAutoAcceptAt}
                  showStartHereHint={showHandHighlight}
                />
              )}
            </div>
          )}

          {/* Cards to Discard — below Your Hand, same styling as Your Hand */}
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
