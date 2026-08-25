"use client";

import * as Ably from "ably";

import { useEffect, useRef, useState } from "react";
import {
  releaseAblySubscription,
} from "@/lib/ably/channel-lifecycle";

export type RoomEvent =
  | "player_joined"
  | "player_left"
  | "game_started"
  | "game_ended"
  | "rematch_ready_updated"
  | "rematch_started"
  | "card_drawn"
  | "card_submitted"
  | "card_discarded"
  | "vote_cast"
  | "card_approved"
  | "card_rejected"
  | "submission_approved"
  | "submission_rejected"
  | "turn_changed"
  | "room_settings_updated"
  | "points_reset"
  | "quarter_advanced"
  | "quarter_ending"
  | "quarter_intermission_ended"
  | "quarter_discard_points_awarded"
  | "quarter_discard_selection_updated"
  | "quarter_discard_done_updated"
  | "suggest_end_round_updated"
  | "suggest_end_round_declined"
  | "round_reset"
  | "message_sent"
  | "reaction_sent";

export interface RoomEventData {
  [key: string]: unknown;
}

/**
 * React hook for subscribing to Ably room channels
 * @param roomCode - The room code to subscribe to
 * @param onEvent - Callback function for handling events
 * @param shouldConnect - When false, do not keep an active connection (default: true)
 * @returns Object with connection state and methods
 */
export function useRoomChannel(
  roomCode: string | null,
  onEvent?: (event: RoomEvent, data: RoomEventData) => void,
  shouldConnect: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<Error | null>(null);
  const channelRef = useRef<Ably.RealtimeChannel | null>(null);
  const clientRef = useRef<Ably.Realtime | null>(null);
  const onEventRef = useRef(onEvent);
  const isCleaningUpRef = useRef(false);

  // Keep the latest onEvent callback in a ref to avoid re-subscribing
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!roomCode || !shouldConnect) {
      return;
    }

    isCleaningUpRef.current = false;

    // Prefer token auth in production (keeps API key server-side, often more reliable)
    const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
    const useTokenAuth =
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_ABLY_USE_TOKEN === "true";

    if (!apiKey && !useTokenAuth) {
      setTimeout(() => {
        setConnectionError(
          new Error("NEXT_PUBLIC_ABLY_API_KEY or ABLY_API_KEY (with token auth) is not set")
        );
      }, 0);
      return;
    }

    const clientOptions = {
      // Token auth: client fetches short-lived token from our API (recommended for production)
      ...(useTokenAuth
        ? { authUrl: "/api/ably/token" }
        : { key: apiKey }),
      realtimeRequestTimeout: 60000,
      disconnectedRetryTimeout: 10000,
    } as Ably.ClientOptions;

    const client = new Ably.Realtime(clientOptions);
    clientRef.current = client;

    // Set up connection state listeners
    client.connection.on("connected", () => {
      if (!isCleaningUpRef.current) {
        setIsConnected(true);
        setConnectionError(null);
      }
    });

    client.connection.on("disconnected", () => {
      if (!isCleaningUpRef.current) {
        setIsConnected(false);
      }
    });

    client.connection.on("failed", (stateChange) => {
      if (!isCleaningUpRef.current) {
        setIsConnected(false);
        setConnectionError(
          new Error(`Connection failed: ${stateChange.reason}`)
        );
        if (process.env.NODE_ENV === "development") console.error(`[Ably] Connection failed for room:${roomCode}`, stateChange.reason);
      }
    });

    // Subscribe to room channel
    const channel = client.channels.get(`room:${roomCode}`);
    channelRef.current = channel;

    // Defer subscribe so Strict Mode cleanup cannot close mid-attach.
    let disposed = false;
    queueMicrotask(() => {
      if (disposed || isCleaningUpRef.current) return;
      channel.subscribe((message) => {
        if (onEventRef.current && message.name) {
          onEventRef.current(message.name as RoomEvent, message.data as RoomEventData);
        }
      });
    });

    // Cleanup
    return () => {
      disposed = true;
      isCleaningUpRef.current = true;
      channelRef.current = null;
      clientRef.current = null;
      setIsConnected(false);
      releaseAblySubscription(channel, client);
    };
  }, [roomCode, shouldConnect]);

  /**
   * Publish an event to the room channel
   */
  const publish = async (event: RoomEvent, data: RoomEventData) => {
    if (!channelRef.current || !isConnected) {
      throw new Error("Channel not connected");
    }

    try {
      await channelRef.current.publish(event, data);
    } catch (error) {
      if (process.env.NODE_ENV === "development") console.error("Failed to publish event:", error);
      throw error;
    }
  };

  return {
    isConnected,
    connectionError,
    publish,
  };
}
