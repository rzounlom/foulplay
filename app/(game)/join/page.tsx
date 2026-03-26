"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect, useCallback, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { JoinRoomCardSkeleton } from "@/components/join/join-room-card-skeleton";
import { useClerkInFlowSignIn } from "@/lib/auth/use-clerk-in-flow-sign-in";

/** Prefer 6-char typed code so return URL survives the auth round-trip (state is lost on reload). */
function buildJoinReturnPath(
  typedCode: string,
  queryCode: string | null,
): string {
  const path = "/join";
  const raw =
    typedCode.length === 6
      ? typedCode.toUpperCase()
      : queryCode?.slice(0, 6)?.toUpperCase() ?? "";
  return raw ? `${path}?code=${encodeURIComponent(raw)}` : path;
}

function JoinRoomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useUser();
  const { openSignInForReturn, authLoaded } = useClerkInFlowSignIn();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hostInviteName, setHostInviteName] = useState<string | null>(null);
  const [joinCtaAttentionActive, setJoinCtaAttentionActive] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);
    const onChange = () => setPrefersReducedMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const stopJoinCtaAttention = useCallback(() => {
    setJoinCtaAttentionActive(false);
  }, []);

  // Auto-fill code from URL query parameter
  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam) {
      setCode(codeParam.toUpperCase().slice(0, 6));
    }
  }, [searchParams]);

  // Host name for invite copy (public preview)
  useEffect(() => {
    const fromQuery = searchParams.get("code")?.trim().toUpperCase().slice(0, 6) ?? "";
    const effective = code.length === 6 ? code.toUpperCase() : fromQuery;
    if (effective.length !== 6) {
      setHostInviteName(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/rooms/invite-preview?code=${encodeURIComponent(effective)}`,
        );
        if (cancelled) return;
        if (res.ok) {
          const data = (await res.json()) as { hostName?: string | null };
          setHostInviteName(data.hostName?.trim() || null);
        } else {
          setHostInviteName(null);
        }
      } catch {
        if (!cancelled) setHostInviteName(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, searchParams]);

  // Fetch user's default nickname once (prefill only when nickname is still empty)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.profile?.defaultNickname) {
            setNickname((prev) => (prev === "" ? data.profile.defaultNickname : prev));
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV === "development") console.error("Failed to fetch default nickname:", err);
      }
    };

    fetchProfile();
  }, [isLoaded, isSignedIn]);

  const ensureSignedInForJoin = (): boolean => {
    if (isSignedIn) return true;
    const returnPath = buildJoinReturnPath(code, searchParams.get("code"));
    openSignInForReturn(returnPath, {
      title: "Sign in to join the game",
      subtitle: "Quick sign-in. No setup.",
    });
    return false;
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    stopJoinCtaAttention();

    if (!ensureSignedInForJoin()) {
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const response = await fetch("/api/rooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code.toUpperCase(),
          nickname: nickname.trim() || undefined,
        }),
      });

      if (!response.ok) {
        let errorMessage = "Failed to join room";
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
      setError(err instanceof Error ? err.message : "Failed to join room");
    } finally {
      setIsJoining(false);
    }
  };

  const inviterLine = hostInviteName
    ? `${hostInviteName} invited you to play`
    : "A friend invited you to play";

  const showJoinPulse =
    joinCtaAttentionActive &&
    !prefersReducedMotion &&
    code.length === 6 &&
    !isJoining;

  if (!isLoaded || !authLoaded) {
    return (
      <div className="flex min-h-[calc(100vh-7.5rem)] items-center justify-center px-4 py-6 md:py-8 bg-background">
        <JoinRoomCardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-7.5rem)] items-center justify-center px-4 py-6 md:py-8 bg-background">
      <div className="w-full max-w-2xl mx-auto my-auto">
        <div className="bg-white dark:bg-neutral-900 rounded-lg p-4 md:p-8 border border-neutral-200 dark:border-neutral-800 shadow-sm dark:shadow-none">
          <div className="mb-4 md:mb-6 space-y-2 text-center sm:text-left">
            <h1 className="text-xl md:text-page-title text-foreground">
              You&apos;ve been invited to a game 🔥
            </h1>
            <p className="text-base md:text-lg font-medium text-foreground">
              {inviterLine}
            </p>
            <p className="text-sm text-neutral-600 dark:text-neutral-400">
              Game is waiting for players…
            </p>
            <p className="text-body-muted text-sm md:text-base">
              Join in seconds and start playing
            </p>
            {!isSignedIn && (
              <p className="text-sm text-neutral-600 dark:text-neutral-400">
                Quick sign-in. No setup.
              </p>
            )}
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <Label htmlFor="code" className="mb-2">
                Your game code
              </Label>
              <Input
                id="code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
                onFocus={stopJoinCtaAttention}
                onPointerDown={stopJoinCtaAttention}
                placeholder="ABCD12"
                maxLength={6}
                className="text-center text-xl md:text-2xl font-mono tracking-widest uppercase min-h-[48px]"
                required
              />
            </div>

            <div>
              <Label htmlFor="nickname" className="mb-2">
                Pick a name for this game{" "}
                <span className="text-neutral-500 dark:text-neutral-400 text-xs font-normal">
                  (optional)
                </span>
              </Label>
              <Input
                id="nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.slice(0, 30))}
                placeholder="Enter a nickname for this game"
                maxLength={30}
                className="min-h-[48px]"
                disabled={!isSignedIn}
              />
              <p className="text-caption mt-1">
                {isSignedIn
                  ? "Leave blank to use your account name"
                  : "You can set this after you sign in"}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-sm">
                {error}
              </div>
            )}

            {!isSignedIn && (
              <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
                Quick sign-in with Google or email
              </p>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={code.length !== 6}
              isLoading={isJoining}
              className={`min-h-[48px] ${showJoinPulse ? "lobby-invite-pulse" : ""}`}
            >
              {isSignedIn ? "Join Game 🔥" : "Sign in to join"}
            </Button>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
              Takes 5 seconds
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function JoinRoomPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[calc(100vh-7.5rem)] items-center justify-center px-4 py-6 md:py-8 bg-background">
        <JoinRoomCardSkeleton />
      </div>
    }>
      <JoinRoomForm />
    </Suspense>
  );
}
