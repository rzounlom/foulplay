"use client";

import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { JoinRoomCardSkeleton } from "@/components/join/join-room-card-skeleton";
import { useClerkInFlowSignIn } from "@/lib/auth/use-clerk-in-flow-sign-in";
import { setLiveJoinToast } from "@/lib/game/live-dropin-session";

export default function PlayLivePage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useUser();
  const { openSignInForReturn, authLoaded } = useClerkInFlowSignIn();
  const [isFinding, setIsFinding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const findGame = useCallback(async () => {
    setIsFinding(true);
    setError(null);
    try {
      const response = await fetch("/api/rooms/public-drop-in", {
        method: "POST",
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Couldn’t join a live game");
      }
      const data = (await response.json()) as {
        code: string;
        status: string;
        created?: boolean;
      };
      setLiveJoinToast();
      router.push(`/game/${data.code}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsFinding(false);
    }
  }, [router]);

  const onPrimaryClick = () => {
    if (!isSignedIn) {
      openSignInForReturn("/play-live", {
        title: "Sign in to jump in",
        subtitle: "Quick sign-in. Then you’re in.",
      });
      return;
    }
    void findGame();
  };

  if (!isLoaded || !authLoaded) {
    return (
      <div className="flex min-h-[calc(100vh-7.5rem)] items-center justify-center px-4 py-6 md:py-8 bg-background">
        <JoinRoomCardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-7.5rem)] items-center justify-center px-4 py-6 md:py-8 bg-background">
      <div className="w-full max-w-lg rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6 md:p-8 shadow-sm text-center">
        <p className="text-2xl font-bold text-foreground mb-1">
          🔥 Join Live Game
        </p>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          Jump into a game already in progress — no code, no waiting room list.
        </p>
        {error ? (
          <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm px-3 py-2">
            {error}
          </div>
        ) : null}
        <Button
          type="button"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={isFinding}
          className="min-h-[52px]"
          onClick={onPrimaryClick}
        >
          {isSignedIn ? "Find me a game 🔥" : "Sign in to play live"}
        </Button>
        <p className="mt-4 text-xs text-neutral-500 dark:text-neutral-500">
          We&apos;ll drop you straight into the action when a table has space.
        </p>
      </div>
    </div>
  );
}
