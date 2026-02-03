"use client";

import { useEffect, useState } from "react";
import { useRoomChannel, RoomEvent } from "@/lib/ably/useRoomChannel";
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
  players: Player[];
}

interface LobbyProps {
  roomCode: string;
  currentUserId: string;
  initialRoom: Room;
}

export function Lobby({ roomCode, currentUserId, initialRoom }: LobbyProps) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [isStarting, setIsStarting] = useState(false);
  const [copied, setCopied] = useState(false);

  // Define fetchRoom before using it in the callback
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

  // Subscribe to room events
  useRoomChannel(roomCode, (event: RoomEvent, data) => {
    console.log("Received Ably event:", event, data);
    if (event === "player_joined") {
      // Refetch room data when a player joins
      console.log("Player joined, refetching room data...");
      fetchRoom();
    } else if (event === "room_settings_updated") {
      // Refetch room data when settings are updated
      fetchRoom();
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
    } catch (error) {
      console.error("Failed to start game:", error);
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
      console.error("Failed to copy URL:", error);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Room {room.code}</h1>
        <div className="flex items-center gap-2 p-3 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-800">
          <input
            type="text"
            value={roomUrl}
            readOnly
            className="flex-1 bg-transparent border-none outline-none text-sm text-neutral-700 dark:text-neutral-300 font-mono"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <button
            onClick={handleCopyUrl}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap cursor-pointer"
          >
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
        <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
          Share this link with friends to join the room
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
          <PlayerList players={room.players} currentUserId={currentUserId} />
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-6 border border-neutral-200 dark:border-neutral-800">
            <h3 className="text-lg font-semibold mb-4">Game Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-600 dark:text-neutral-400">
                  Mode
                </label>
                {isHost ? (
                  <select
                    className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
                    value={room.mode || ""}
                    onChange={async (e) => {
                      // Update room mode
                      try {
                        const response = await fetch(`/api/rooms/${roomCode}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ mode: e.target.value }),
                        });
                        if (response.ok) {
                          const updatedRoom = await response.json();
                          setRoom(updatedRoom);
                        }
                      } catch (error) {
                        console.error("Failed to update mode:", error);
                      }
                    }}
                  >
                    <option value="casual">Casual</option>
                    <option value="party">Party</option>
                    <option value="lit">Lit</option>
                    <option value="non-drinking">Non-drinking</option>
                  </select>
                ) : (
                  <div className="p-2 border border-neutral-300 dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 capitalize">
                    {room.mode || "Not set"}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-neutral-600 dark:text-neutral-400">
                  Sport
                </label>
                {isHost ? (
                  <select
                    className="w-full p-2 border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800"
                    value={room.sport || ""}
                    onChange={async (e) => {
                      // Update room sport
                      try {
                        const response = await fetch(`/api/rooms/${roomCode}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ sport: e.target.value }),
                        });
                        if (response.ok) {
                          const updatedRoom = await response.json();
                          setRoom(updatedRoom);
                        }
                      } catch (error) {
                        console.error("Failed to update sport:", error);
                      }
                    }}
                  >
                    <option value="football">Football</option>
                    <option value="basketball">Basketball</option>
                  </select>
                ) : (
                  <div className="p-2 border border-neutral-300 dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 capitalize">
                    {room.sport || "Not set"}
                  </div>
                )}
              </div>
            </div>
          </div>

          {isHost && (
            <button
              onClick={handleStartGame}
              disabled={!canStart || isStarting}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                canStart
                  ? "bg-primary text-white hover:bg-primary/90 cursor-pointer"
                  : "bg-neutral-300 dark:bg-neutral-700 text-neutral-500 cursor-not-allowed"
              }`}
            >
              {isStarting
                ? "Starting..."
                : room.players.length < 2
                  ? "Need at least 2 players"
                  : "Start Game"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
