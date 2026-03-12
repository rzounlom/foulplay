"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRoomStateChannel } from "@/lib/ably/useRoomStateChannel";
import { applyRoomEvent, type RoomSnapshot } from "@/lib/realtime/apply-room-event";
import type { RoomEvent } from "@/lib/realtime/room-events";

export interface UseRoomStateResult {
  snapshot: RoomSnapshot | null;
  lastSeenVersion: number;
  isLoading: boolean;
  error: Error | null;
  resyncRoomSnapshot: () => Promise<RoomSnapshot | null>;
  isStateChannelConnected: boolean;
}

/**
 * Fetches authoritative room snapshot and subscribes to room:{roomCode}:state.
 * Applies version-aware event patching. Triggers resync on version gap.
 */
export function useRoomState(
  roomCode: string | null,
  currentUserId: string
): UseRoomStateResult {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [lastSeenVersion, setLastSeenVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const resyncInProgressRef = useRef(false);
  const lastSeenVersionRef = useRef(0);
  const snapshotRef = useRef<RoomSnapshot | null>(null);
  lastSeenVersionRef.current = lastSeenVersion;
  snapshotRef.current = snapshot;

  const resyncRoomSnapshot = useCallback(async (): Promise<RoomSnapshot | null> => {
    if (!roomCode || resyncInProgressRef.current) return null;
    resyncInProgressRef.current = true;
    try {
      const response = await fetch(`/api/rooms/${roomCode}/snapshot`);
      if (!response.ok) throw new Error("Failed to fetch snapshot");
      const data = await response.json();
      setSnapshot(data);
      const v = data.version ?? 0;
      setLastSeenVersion(v);
      lastSeenVersionRef.current = v;
      setError(null);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Snapshot fetch failed"));
      if (process.env.NODE_ENV === "development") {
        console.error("[useRoomState] Resync failed:", err);
      }
      return null;
    } finally {
      resyncInProgressRef.current = false;
    }
  }, [roomCode]);

  // Initial snapshot fetch
  useEffect(() => {
    if (!roomCode) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    resyncRoomSnapshot().finally(() => setIsLoading(false));
  }, [roomCode, resyncRoomSnapshot]);

  const handleStateEvent = useCallback(
    (event: RoomEvent) => {
      const evVersion = event.version ?? 0;
      const currentVersion = lastSeenVersionRef.current;

      setSnapshot((prev) => {
        if (!prev) return prev;

        if (evVersion <= currentVersion) return prev;

        if (evVersion > currentVersion + 1) {
          resyncRoomSnapshot();
          return prev;
        }

        const next = applyRoomEvent(prev, event, currentUserId);
        if (next) {
          setLastSeenVersion(next.version);
          lastSeenVersionRef.current = next.version;
          return next;
        }
        resyncRoomSnapshot();
        return prev;
      });

      // hand.replenished: event has no card data; targeted refetch of our hand only
      if (event.type === "hand.replenished" && roomCode && "playerId" in event) {
        const ev = event as { playerId: string };
        const currentPlayer = snapshotRef.current?.players?.find((p) => p.userId === currentUserId);
        if (currentPlayer?.id === ev.playerId) {
          fetch(`/api/game/hand?roomCode=${roomCode}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (data?.cards) {
                setSnapshot((s) => (s ? { ...s, hand: data.cards } : s));
              }
            })
            .catch(() => {});
        }
      }

      // submission.created: patch adds minimal submission; refetch to get full card data
      if (event.type === "submission.created" && roomCode) {
        fetch(`/api/game/submissions?roomCode=${roomCode}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.submissions) {
              setSnapshot((s) => (s ? { ...s, submissions: data.submissions } : s));
            }
          })
          .catch(() => {});
      }

      // submission.vote_cast: event has no vote counts; targeted refetch of submissions
      if (event.type === "submission.vote_cast" && roomCode) {
        fetch(`/api/game/submissions?roomCode=${roomCode}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.submissions) {
              setSnapshot((s) => (s ? { ...s, submissions: data.submissions } : s));
            }
          })
          .catch(() => {});
      }

      // player.joined / player.left: player list changed; resync full snapshot
      if ((event.type === "player.joined" || event.type === "player.left") && roomCode) {
        resyncRoomSnapshot();
      }
    },
    [roomCode, currentUserId, resyncRoomSnapshot]
  );

  const { isConnected: isStateChannelConnected } = useRoomStateChannel(
    roomCode,
    handleStateEvent
  );

  return {
    snapshot,
    lastSeenVersion,
    isLoading,
    error,
    resyncRoomSnapshot,
    isStateChannelConnected,
  };
}
