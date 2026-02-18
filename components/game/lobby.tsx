"use client";

import { RoomEvent, useRoomChannel } from "@/lib/ably/useRoomChannel";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlayerList } from "./player-list";
import { ShareModal } from "./share-modal";
import { Select } from "@/components/ui/select";
import { useRouter } from "next/navigation";

interface Player {
  id: string;
  user: {
    id: string;
    name: string;
  };
  isHost: boolean;
  points: number;
}

interface Room {
  id: string;
  code: string;
  status: string;
  mode: string | null;
  sport: string | null;
  showPoints: boolean;
  handSize: number;
  allowQuarterClearing: boolean;
  currentQuarter: string | null;
  canTurnInCards: boolean;
  players: Player[];
}

interface LobbyProps {
  roomCode: string;
  currentUserId: string;
  initialRoom: Room;
}

const MODE_LABELS: Record<string, string> = {
  casual: "Casual — mild drinking penalties",
  party: "Party — balanced mix",
  lit: "Get Lit — intense drinking penalties",
  "non-drinking": "Non-drinking",
};

export function Lobby({ roomCode, currentUserId, initialRoom }: LobbyProps) {
  const router = useRouter();
  const [room, setRoom] = useState<Room>(initialRoom);
  const [isStarting, setIsStarting] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  const updateRoomSettings = async (payload: Record<string, unknown>) => {
    setIsUpdatingSettings(true);
    try {
      const response = await fetch(`/api/rooms/${roomCode}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (response.ok) {
        const updatedRoom = await response.json();
        setRoom(updatedRoom);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to update room settings:", error);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  const fetchRoom = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}`);
      if (response.ok) {
        const roomData = await response.json();
        setRoom(roomData);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to fetch room:", error);
    }
  }, [roomCode]);

  // Subscribe to room events; fall back to polling when Ably is disconnected
  const { isConnected } = useRoomChannel(roomCode, (event: RoomEvent) => {
    if (event === "player_joined") {
      fetchRoom();
    } else if (event === "room_settings_updated") {
      fetchRoom();
    } else if (event === "game_started") {
      router.push(`/game/${roomCode}?tour=1`);
    }
  });

  // Polling fallback when Ably is disconnected — start after 2s grace, poll every 3s
  useEffect(() => {
    if (isConnected) return;
    let pollInterval: ReturnType<typeof setInterval> | null = null;
    const graceTimer = setTimeout(() => {
      const doPoll = async () => {
        try {
          const response = await fetch(`/api/rooms/${roomCode}`);
          if (response.ok) {
            const roomData = await response.json();
            setRoom(roomData);
            if (roomData.status === "active") {
              router.push(`/game/${roomCode}?tour=1`);
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === "development")
            console.error("Failed to poll room:", error);
        }
      };
      doPoll();
      pollInterval = setInterval(doPoll, 3000);
    }, 2000);
    return () => {
      clearTimeout(graceTimer);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isConnected, roomCode, router]);

  const handleStartGame = async () => {
    if (room.players.length < 2) {
      return;
    }

    setIsStarting(true);
    try {
      const response = await fetch("/api/game/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode }),
      });

      if (!response.ok) {
        throw new Error("Failed to start game");
      }

      // After successful start, refresh the page to show game board
      // The server component will re-fetch with the new status
      router.refresh();
    } catch (error) {
      if (process.env.NODE_ENV === "development")
        console.error("Failed to start game:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const isHost = room.players.some(
    (p) => p.user.id === currentUserId && p.isHost,
  );
  const canStart = room.players.length >= 2 && isHost;

  const roomUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join?code=${roomCode}`
      : "";

  return (
    <div className="container mx-auto px-4 py-6 md:p-6 max-w-4xl min-h-screen bg-background">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-page-title text-foreground mb-3 md:mb-4">
          Room {room.code}
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 md:p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <Input
            type="text"
            value={roomUrl}
            readOnly
            className="flex-1 min-w-0 border-0 bg-transparent p-0 text-sm md:text-base focus:ring-0 focus:ring-offset-0"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button
            variant="primary"
            size="md"
            onClick={() => setShareModalOpen(true)}
            className="whitespace-nowrap min-h-[44px] sm:min-h-0 shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
            Share
          </Button>
        </div>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Share this link with friends to join the room
        </p>
        <ShareModal
          isOpen={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          url={roomUrl}
          title="Share invite link"
          shareText={`Join my FoulPlay game! Room ${roomCode}`}
        />
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
          <PlayerList
            players={room.players}
            currentUserId={currentUserId}
            showPoints={room.showPoints}
          />
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
            <h3 className="text-lg md:text-section-title text-foreground mb-3 md:mb-4">
              Game Settings
            </h3>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 text-neutral-600 dark:text-neutral-400">
                  Mode
                </Label>
                {isHost ? (
                  <Select
                    value={room.mode || ""}
                    disabled={isUpdatingSettings}
                    onChange={(e) =>
                      updateRoomSettings({ mode: e.target.value })
                    }
                  >
                    <option value="">Select mode</option>
                    <option value="casual">Casual — mild drinking penalties</option>
                    <option value="party">Party — balanced mix</option>
                    <option value="lit">Get Lit — intense drinking penalties</option>
                    <option value="non-drinking">Non-drinking</option>
                  </Select>
                ) : (
                  <div className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300">
                    {room.mode ? MODE_LABELS[room.mode] ?? room.mode : "Not set"}
                  </div>
                )}
              </div>
              <div>
                <Label className="mb-2 text-neutral-600 dark:text-neutral-400">
                  Sport
                </Label>
                {isHost ? (
                  <Select
                    value={room.sport || ""}
                    disabled={isUpdatingSettings}
                    onChange={(e) =>
                      updateRoomSettings({ sport: e.target.value })
                    }
                  >
                    <option value="football">Football</option>
                    <option value="basketball">Basketball</option>
                  </Select>
                ) : (
                  <div className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 capitalize">
                    {room.sport || "Not set"}
                  </div>
                )}
              </div>
              <div>
                <Label className="mb-2 text-neutral-600 dark:text-neutral-400">
                  Cards Per Hand
                </Label>
                {isHost ? (
                  <Select
                    value={room.handSize ?? 6}
                    disabled={isUpdatingSettings}
                    onChange={(e) =>
                      updateRoomSettings({ handSize: Number(e.target.value) })
                    }
                  >
                    {[4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                      <option key={n} value={n}>
                        {n} cards
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300">
                    {room.handSize || 6} cards
                  </div>
                )}
              </div>
              {isHost && (
                <>
                  <div>
                    <Label className="mb-2 text-neutral-600 dark:text-neutral-400">
                      Show Points
                    </Label>
                    <label
                      className={`flex items-center gap-2 ${isUpdatingSettings ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                    >
                      <Checkbox
                        checked={room.showPoints}
                        disabled={isUpdatingSettings}
                        onChange={(e) =>
                          updateRoomSettings({ showPoints: e.target.checked })
                        }
                      />
                      <span className="text-sm text-neutral-700 dark:text-neutral-300">
                        Show all players&apos; points
                      </span>
                    </label>
                  </div>
                  {(room.sport === "football" ||
                    room.sport === "basketball") && (
                    <div>
                      <Label className="mb-2 text-neutral-600 dark:text-neutral-400">
                        End Round
                      </Label>
                      <label
                        className={`flex items-center gap-2 ${isUpdatingSettings ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                      >
                        <Checkbox
                          checked={room.allowQuarterClearing}
                          disabled={isUpdatingSettings}
                          onChange={(e) =>
                            updateRoomSettings({
                              allowQuarterClearing: e.target.checked,
                            })
                          }
                        />
                        <span className="text-sm text-neutral-700 dark:text-neutral-300">
                          Enable round-based card clearing
                        </span>
                      </label>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-6">
                        Host can end rounds; players get 5 minutes to turn in
                        unwanted cards
                        {room.mode === "non-drinking"
                          ? " (points apply)."
                          : " (drink penalty applies)."}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {isHost && (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              onClick={handleStartGame}
              disabled={!canStart}
              isLoading={isStarting}
              className="min-h-[48px]"
            >
              {room.players.length < 2
                ? "Need at least 2 players"
                : "Start Game"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
