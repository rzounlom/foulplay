"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect } from "react";

export default function CreateRoomPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("");
  const [sport, setSport] = useState<string>("");
  const [handSize, setHandSize] = useState<number>(5);
  const [allowQuarterClearing, setAllowQuarterClearing] = useState<boolean>(false);

  // Redirect to sign-in if not authenticated, preserving the current path
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const currentPath = window.location.pathname;
      router.push(`/sign-in?redirect_url=${encodeURIComponent(currentPath)}`);
    }
  }, [isLoaded, isSignedIn, router]);

  const handleCreateRoom = async () => {
    if (!isSignedIn) {
      const currentPath = window.location.pathname;
      router.push(`/sign-in?redirect_url=${encodeURIComponent(currentPath)}`);
      return;
    }

    setIsCreating(true);
    setError(null);

    if (!mode || !sport) {
      setError("Please select both mode and sport");
      setIsCreating(false);
      return;
    }

    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          sport,
          handSize,
          ...(sport === "football" || sport === "basketball"
            ? { allowQuarterClearing }
            : {}),
        }),
      });

      if (!response.ok) {
        // Try to parse JSON error, fallback to status text
        let errorMessage = "Failed to create room";
        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const room = await response.json();
      router.push(`/game/${room.code}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room");
    } finally {
      setIsCreating(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-8 border border-neutral-200 dark:border-neutral-800">
            <p className="text-center">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return null; // Will redirect via useEffect
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-8 border border-neutral-200 dark:border-neutral-800">
        <h1 className="text-3xl font-bold mb-4">Create a Room</h1>
        <p className="text-neutral-600 dark:text-neutral-400 mb-6">
          Start a new game room and invite your friends to join.
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
            {error}
          </div>
        )}

        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="mode" className="block text-sm font-medium mb-2">
              Game Mode <span className="text-red-500">*</span>
            </label>
            <select
              id="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
              required
            >
              <option value="">Select mode</option>
              <option value="casual">Casual</option>
              <option value="party">Party</option>
              <option value="lit">Lit</option>
              <option value="non-drinking">Non-drinking</option>
            </select>
          </div>

          <div>
            <label htmlFor="sport" className="block text-sm font-medium mb-2">
              Sport <span className="text-red-500">*</span>
            </label>
            <select
              id="sport"
              value={sport}
              onChange={(e) => {
                const newSport = e.target.value;
                setSport(newSport);
                if (newSport !== "football" && newSport !== "basketball") {
                  setAllowQuarterClearing(false);
                }
              }}
              className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
              required
            >
              <option value="">Select sport</option>
              <option value="football">Football</option>
              <option value="basketball">Basketball</option>
            </select>
          </div>

          {(sport === "football" || sport === "basketball") && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowQuarterClearing}
                  onChange={(e) => setAllowQuarterClearing(e.target.checked)}
                  className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-700 cursor-pointer"
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

          <div>
            <label htmlFor="handSize" className="block text-sm font-medium mb-2">
              Cards Per Hand <span className="text-red-500">*</span>
            </label>
            <select
              id="handSize"
              value={handSize}
              onChange={(e) => setHandSize(Number(e.target.value))}
              className="w-full p-3 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
              required
            >
              <option value={4}>4 cards</option>
              <option value={5}>5 cards (default)</option>
              <option value={6}>6 cards</option>
              <option value={7}>7 cards</option>
              <option value={8}>8 cards</option>
              <option value={9}>9 cards</option>
              <option value={10}>10 cards</option>
            </select>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Number of cards each player starts with
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateRoom}
          disabled={isCreating || !mode || !sport || !handSize}
          className="w-full py-3 px-4 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isCreating ? "Creating..." : "Create Room"}
        </button>
        </div>
      </div>
    </div>
  );
}
