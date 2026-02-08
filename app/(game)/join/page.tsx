"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useState, useEffect, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

function JoinRoomForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded } = useUser();
  const [code, setCode] = useState("");
  const [nickname, setNickname] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-fill code from URL query parameter
  useEffect(() => {
    const codeParam = searchParams.get("code");
    if (codeParam) {
      setCode(codeParam.toUpperCase().slice(0, 6));
    }
  }, [searchParams]);

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
        // Silently fail - user can still enter nickname manually
        console.error("Failed to fetch default nickname:", err);
      }
    };

    fetchProfile();
  }, [isLoaded, isSignedIn]);

  // Redirect to sign-in if not authenticated, preserving the current path and code
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const currentPath = window.location.pathname;
      const codeParam = searchParams.get("code");
      const redirectUrl = codeParam 
        ? `${currentPath}?code=${codeParam}`
        : currentPath;
      router.push(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`);
    }
  }, [isLoaded, isSignedIn, router, searchParams]);

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isSignedIn) {
      const currentPath = window.location.pathname;
      const codeParam = searchParams.get("code");
      const redirectUrl = codeParam 
        ? `${currentPath}?code=${codeParam}`
        : currentPath;
      router.push(`/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`);
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
        // Try to parse JSON error, fallback to status text
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
        <h1 className="text-page-title text-foreground mb-4">Join a Room</h1>
        <p className="text-body-muted mb-6">
          Enter the 6-character room code to join a game.
        </p>

        <form onSubmit={handleJoinRoom} className="space-y-4">
          <div>
            <Label htmlFor="code" className="mb-2">Room Code</Label>
            <Input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
              placeholder="ABCD12"
              maxLength={6}
              className="text-center text-2xl font-mono tracking-widest uppercase"
              required
            />
          </div>

          <div>
            <Label htmlFor="nickname" className="mb-2">
              Nickname <span className="text-neutral-500 dark:text-neutral-400 text-xs font-normal">(optional)</span>
            </Label>
            <Input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value.slice(0, 30))}
              placeholder="Enter a nickname for this game"
              maxLength={30}
            />
            <p className="text-caption mt-1">
              Leave blank to use your account name
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">
              {error}
            </div>
          )}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={code.length !== 6}
            isLoading={isJoining}
          >
            Join Room
          </Button>
        </form>
        </div>
      </div>
    </div>
  );
}

export default function JoinRoomPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          <div className="bg-white dark:bg-neutral-900 rounded-lg p-8 border border-neutral-200 dark:border-neutral-800">
            <p className="text-center">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <JoinRoomForm />
    </Suspense>
  );
}
