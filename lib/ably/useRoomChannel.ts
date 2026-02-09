"use client";

import * as Ably from "ably";

import { useEffect, useRef, useState } from "react";

export type RoomEvent =
  | "player_joined"
  | "player_left"
  | "game_started"
  | "game_ended"
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
  | "turn_in_control_changed"
  | "quarter_ending"
  | "quarter_intermission_ended"
  | "quarter_discard_selection_updated"
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
 * @returns Object with connection state and methods
 */
export function useRoomChannel(
  roomCode: string | null,
  onEvent?: (event: RoomEvent, data: RoomEventData) => void
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
    if (!roomCode) {
      return;
    }

    // Initialize Ably client
    const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
    if (!apiKey) {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => {
        setConnectionError(
          new Error("NEXT_PUBLIC_ABLY_API_KEY is not set")
        );
      }, 0);
      return;
    }

    const client = new Ably.Realtime({ key: apiKey });
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

    // Subscribe to all events
    // Use onEventRef.current to always call the latest callback without re-subscribing
    channel.subscribe((message) => {
      if (onEventRef.current && message.name) {
        onEventRef.current(message.name as RoomEvent, message.data as RoomEventData);
      }
    });

    // Attach to channel to ensure we're subscribed
    // Check channel state first to avoid attaching when already attached or detaching
    const channelState = channel.state;
    if (channelState === "attached") {
      // Already attached, no-op
    } else if (channelState === "detached" || channelState === "failed") {
      // Only attach if channel is detached or failed
      channel.attach().then(() => {}).catch((err) => {
        // Only log if it's not a state-related error (which is expected during cleanup)
                    const errorMessage = err?.message || err?.toString() || "";
                    if (process.env.NODE_ENV === "development" && !errorMessage.includes("state = detached") && !errorMessage.includes("state = detaching")) {
          console.error(`[Ably] Failed to attach to channel room:${roomCode}`, err);
        }
      });
    } else if (channelState === "attaching") {
      // Channel is already attaching, wait for it to complete
      channel.attach().then(() => {}).catch(() => {
        // Silently ignore - channel might already be attached
      });
    } else {
      // Channel is in a transitional state (detaching), wait a bit and try again
      setTimeout(() => {
        const currentState = channel.state;
        if (currentState === "detached" || currentState === "failed") {
          channel.attach().then(() => {}).catch(() => {
            // Silently ignore retry failures
          });
        }
      }, 100);
    }

    // Cleanup
    return () => {
      isCleaningUpRef.current = true;

      const cleanup = async () => {
        try {
          // Unsubscribe and detach from channel first
          if (channelRef.current) {
            const channel = channelRef.current;
            channelRef.current = null; // Clear ref first

            try {
              // Unsubscribe from all messages
              channel.unsubscribe();
            } catch {
              // Ignore unsubscribe errors
            }

            // Don't await detach - just fire and forget with error handling
            // This prevents blocking and unhandled promise rejections
            try {
              const channelState = channel.state;
              // Only detach if not already detached or failed
              if (channelState !== "detached" && channelState !== "failed" && channelState !== "detaching") {
                // Fire and forget - don't await to avoid blocking cleanup
                const detachPromise = channel.detach();
                // Catch any errors immediately to prevent unhandled rejections
                if (detachPromise && typeof detachPromise.catch === "function") {
                  detachPromise.catch((err) => {
                    // Silently ignore expected errors during cleanup
                    // These are normal when component unmounts quickly
                    const errorMessage = err?.message || err?.toString() || "";
                    if (process.env.NODE_ENV === "development" && !errorMessage.includes("state = detached") && !errorMessage.includes("state = detaching")) {
                      console.warn(`[Ably] Unexpected error during channel detach:`, err);
                    }
                  });
                }
              }
            } catch {
              // Ignore any synchronous errors
            }
          }

          // Close client connection
          if (clientRef.current) {
            const client = clientRef.current;
            clientRef.current = null; // Clear ref first to prevent re-use

            // Don't await close - just fire and forget
            // This prevents blocking cleanup and unhandled promise rejections
            try {
              const state = client.connection.state;
              // Only close if not already closed or failed
              if (state !== "closed" && state !== "failed" && state !== "closing") {
                // Fire and forget - don't await to avoid blocking cleanup
                // Just call close and let it happen asynchronously
                try {
                  client.close();
                } catch {
                  // Ignore any synchronous errors from close()
                }
              }
            } catch {
              // Ignore cleanup errors
            }
          }

          setIsConnected(false);
        } catch {
          // Ignore all cleanup errors (client might already be closed)
        }
      };

      // Run cleanup asynchronously and catch any unhandled errors
      cleanup().catch(() => {
        // Silently ignore all cleanup errors
      });
    };
  }, [roomCode]);

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
