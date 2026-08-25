"use client";

import * as Ably from "ably";
import { useEffect, useRef, useState } from "react";
import type { RoomEvent } from "@/lib/realtime/room-events";
import {
  releaseAblySubscription,
} from "@/lib/ably/channel-lifecycle";

/**
 * Subscribe to room:{roomCode}:state for authoritative gameplay events.
 * Events are published with name "event" and payload is a RoomEvent.
 * @param shouldConnect - When false, do not keep an active connection (default: true)
 */
export function useRoomStateChannel(
  roomCode: string | null,
  onEvent?: (event: RoomEvent) => void,
  shouldConnect: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  const isCleaningUpRef = useRef(false);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!roomCode || !shouldConnect) return;

    isCleaningUpRef.current = false;

    const apiKey = process.env.NEXT_PUBLIC_ABLY_API_KEY;
    const useTokenAuth =
      process.env.NODE_ENV === "production" ||
      process.env.NEXT_PUBLIC_ABLY_USE_TOKEN === "true";

    if (!apiKey && !useTokenAuth) return;

    const clientOptions = {
      ...(useTokenAuth ? { authUrl: "/api/ably/token" } : { key: apiKey }),
      realtimeRequestTimeout: 60000,
      disconnectedRetryTimeout: 10000,
    } as Ably.ClientOptions;

    const client = new Ably.Realtime(clientOptions);
    const channelName = `room:${roomCode}:state`;
    const channel = client.channels.get(channelName);

    client.connection.on("connected", () => {
      if (!isCleaningUpRef.current) setIsConnected(true);
    });
    client.connection.on("disconnected", () => {
      if (!isCleaningUpRef.current) setIsConnected(false);
    });

    // Defer subscribe so Strict Mode cleanup cannot close mid-attach.
    let disposed = false;
    queueMicrotask(() => {
      if (disposed || isCleaningUpRef.current) return;
      channel.subscribe("event", (message) => {
        const data = message.data as RoomEvent;
        if (data?.type && onEventRef.current) {
          onEventRef.current(data);
        }
      });
    });

    return () => {
      disposed = true;
      isCleaningUpRef.current = true;
      setIsConnected(false);
      releaseAblySubscription(channel, client);
    };
  }, [roomCode, shouldConnect]);

  return { isConnected };
}
