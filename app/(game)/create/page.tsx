"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { GAME_MODES, MODE_LABELS } from "@/lib/game/modes";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CreateRoomCardSkeleton } from "@/components/create/create-room-card-skeleton";
import { useClerkInFlowSignIn } from "@/lib/auth/use-clerk-in-flow-sign-in";

export default function CreateRoomPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { openSignInForReturn, authLoaded } = useClerkInFlowSignIn();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<string>("");
  const [sport, setSport] = useState<string>("");
  const [handSize, setHandSize] = useState<number>(6);
  const [allowQuarterClearing, setAllowQuarterClearing] = useState<boolean>(false);

  const handleCreateRoom = async () => {
    if (!isSignedIn) {
      openSignInForReturn("/create", {
        title: "Sign in to start a game",
        subtitle: "Quick sign-in with Google or email",
      });
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

  if (!isLoaded || !authLoaded) {
    return (
      <div className="flex min-h-[calc(100vh-7.5rem)] items-center justify-center px-4 py-6 md:py-8 bg-background">
        <CreateRoomCardSkeleton />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-[calc(100vh-7.5rem)] items-center justify-center px-4 py-6 md:py-8 bg-background">
        <div className="w-full max-w-2xl mx-auto my-auto">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
            <h1 className="text-xl md:text-page-title text-foreground mb-3 md:mb-4">Create a Room</h1>
            <p className="text-body-muted text-sm md:text-base mb-3">
              Start a new game room and invite your friends to join.
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-2">
              Join in seconds — no account setup
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">
              Quick sign-in with Google or email
            </p>
            <Button
              variant="primary"
              size="lg"
              fullWidth
              className="min-h-[48px]"
              onClick={() =>
                openSignInForReturn("/create", {
                  title: "Sign in to start a game",
                  subtitle: "Quick sign-in with Google or email",
                })
              }
            >
              Sign in to create a room
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-7.5rem)] items-center justify-center px-4 py-6 md:py-8 bg-background">
      <div className="w-full max-w-2xl mx-auto my-auto">
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
          <h1 className="text-xl md:text-page-title text-foreground mb-3 md:mb-4">Create a Room</h1>
          <p className="text-body-muted text-sm md:text-base mb-4 md:mb-6">
            Start a new game room and invite your friends to join.
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4 md:space-y-5 mb-6">
          <div>
            <Label htmlFor="mode" className="mb-2" required>Game Mode</Label>
            <Select
              id="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
              required
            >
              <option value="">Select mode</option>
              {GAME_MODES.map((m) => (
                <option key={m} value={m}>
                  {MODE_LABELS[m]}
                </option>
              ))}
            </Select>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Mode affects the mix of card severities (mild / moderate / severe) in the deck.
            </p>
          </div>

          <div>
            <Label htmlFor="sport" className="mb-2" required>Sport</Label>
            <Select
              id="sport"
              value={sport}
              onChange={(e) => {
                const newSport = e.target.value;
                if (
                  newSport !== "" &&
                  newSport !== "football" &&
                  newSport !== "basketball"
                ) {
                  return;
                }
                setSport(newSport);
                if (newSport !== "football" && newSport !== "basketball") {
                  setAllowQuarterClearing(false);
                }
              }}
              required
            >
              <option value="">Select sport</option>
              <option value="football">Football</option>
              <option value="basketball">Basketball</option>
              <option
                value="soccer"
                disabled
                title="Coming soon after beta"
              >
                Soccer (Coming Soon)
              </option>
              <option
                value="baseball"
                disabled
                title="Coming soon after beta"
              >
                Baseball (Coming Soon)
              </option>
            </Select>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Soccer and Baseball are coming soon after beta.
            </p>
          </div>

          {(sport === "football" || sport === "basketball") && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={allowQuarterClearing}
                  onChange={(e) => setAllowQuarterClearing(e.target.checked)}
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">
                  Enable round clearing
                </span>
              </label>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 ml-6">
                Host controls when rounds end; players get 5 minutes to turn in unwanted cards
                {mode === "non-drinking" ? " (points apply)." : " (drink penalty applies)."}
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="handSize" className="mb-2" required>Cards Per Hand</Label>
            <Select
              id="handSize"
              value={handSize}
              onChange={(e) => setHandSize(Number(e.target.value))}
              required
            >
              <option value={4}>4 cards</option>
              <option value={5}>5 cards</option>
              <option value={6}>6 cards (default)</option>
              <option value={7}>7 cards</option>
              <option value={8}>8 cards</option>
              <option value={9}>9 cards</option>
              <option value={10}>10 cards</option>
              <option value={11}>11 cards</option>
              <option value={12}>12 cards</option>
            </Select>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Number of cards each player starts with
            </p>
          </div>
        </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleCreateRoom}
            disabled={!mode || !sport || !handSize}
            isLoading={isCreating}
            className="min-h-[48px]"
          >
            Create Room
          </Button>
        </div>
      </div>
    </div>
  );
}
