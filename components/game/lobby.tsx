"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRoomChannel, RoomEvent } from "@/lib/ably/useRoomChannel";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { PlayerList } from "./player-list";

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

export function Lobby({ roomCode, currentUserId, initialRoom }: LobbyProps) {
  const router = useRouter();
  const [room, setRoom] = useState<Room>(initialRoom);
  const [isStarting, setIsStarting] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);
  const [copied, setCopied] = useState(false);

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
      if (process.env.NODE_ENV === "development") console.error("Failed to update room settings:", error);
    } finally {
      setIsUpdatingSettings(false);
    }
  };

  // Define fetchRoom before using it in the callback
  const fetchRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/${roomCode}`);
      if (response.ok) {
        const roomData = await response.json();
        setRoom(roomData);
      }
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("Failed to fetch room:", error);
    }
  };

  // Subscribe to room events
  useRoomChannel(roomCode, (event: RoomEvent) => {
    if (event === "player_joined") {
      fetchRoom();
    } else if (event === "room_settings_updated") {
      fetchRoom();
    } else if (event === "game_started") {
      router.refresh();
    }
  });

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
      if (process.env.NODE_ENV === "development") console.error("Failed to start game:", error);
    } finally {
      setIsStarting(false);
    }
  };

  const isHost = room.players.some(
    (p) => p.user.id === currentUserId && p.isHost
  );
  const canStart = room.players.length >= 2 && isHost;

  const roomUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/join?code=${roomCode}`
    : "";

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("Failed to copy URL:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 md:p-6 max-w-4xl min-h-screen bg-background">
      <div className="mb-6 md:mb-8">
        <h1 className="text-xl md:text-page-title text-foreground mb-3 md:mb-4">Room {room.code}</h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 p-3 md:p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <Input
            type="text"
            value={roomUrl}
            readOnly
            className="flex-1 min-w-0 border-0 bg-transparent p-0 text-sm md:text-base focus:ring-0 focus:ring-offset-0"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button
            variant={copied ? "success" : "primary"}
            size="md"
            onClick={handleCopyUrl}
            className="whitespace-nowrap min-h-[44px] sm:min-h-0 shrink-0"
          >
            {copied ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              "Copy Link"
            )}
          </Button>
        </div>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          {copied ? "Link copied to clipboard. Share it with friends to join the room." : "Share this link with friends to join the room"}
        </p>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
          <PlayerList players={room.players} currentUserId={currentUserId} showPoints={room.showPoints} />
        </div>

        <div className="space-y-4 md:space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-6 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
            <h3 className="text-lg md:text-section-title text-foreground mb-3 md:mb-4">Game Settings</h3>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 text-neutral-600 dark:text-neutral-400">Mode</Label>
                {isHost ? (
                  <Select
                    value={room.mode || ""}
                    disabled={isUpdatingSettings}
                    onChange={(e) => updateRoomSettings({ mode: e.target.value })}
                  >
                    <option value="casual">Casual</option>
                    <option value="party">Party</option>
                    <option value="lit">Lit</option>
                    <option value="non-drinking">Non-drinking</option>
                  </Select>
                ) : (
                  <div className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300 capitalize">
                    {room.mode || "Not set"}
                  </div>
                )}
              </div>
              <div>
                <Label className="mb-2 text-neutral-600 dark:text-neutral-400">Sport</Label>
                {isHost ? (
                  <Select
                    value={room.sport || ""}
                    disabled={isUpdatingSettings}
                    onChange={(e) => updateRoomSettings({ sport: e.target.value })}
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
                <Label className="mb-2 text-neutral-600 dark:text-neutral-400">Cards Per Hand</Label>
                {isHost ? (
                  <Select
                    value={room.handSize ?? 5}
                    disabled={isUpdatingSettings}
                    onChange={(e) =>
                      updateRoomSettings({ handSize: Number(e.target.value) })
                    }
                  >
                    {[4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>
                        {n} cards
                      </option>
                    ))}
                  </Select>
                ) : (
                  <div className="w-full rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-sm text-neutral-700 dark:text-neutral-300">
                    {room.handSize || 5} cards
                  </div>
                )}
              </div>
              {isHost && (
                <>
                  <div>
                    <Label className="mb-2 text-neutral-600 dark:text-neutral-400">Show Points</Label>
                    <label className={`flex items-center gap-2 ${isUpdatingSettings ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
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
                  {(room.sport === "football" || room.sport === "basketball") && (
                    <div>
                      <Label className="mb-2 text-neutral-600 dark:text-neutral-400">Quarter Clearing</Label>
                      <label className={`flex items-center gap-2 ${isUpdatingSettings ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
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
                          Enable quarter-based card clearing
                        </span>
                      </label>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-6">
                        Host can end quarters; players get 5 minutes to turn in unwanted cards (drink penalty applies).
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {isHost && (
            <Button
              variant="outline-primary"
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
