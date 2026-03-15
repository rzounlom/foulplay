"use client";

import * as Ably from "ably";
import { useEffect, useRef, useState } from "react";
import type { RoomEvent } from "@/lib/realtime/room-events";

/**
 * Subscribe to room:{roomCode}:state for authoritative gameplay events.
 * Events are published with name "event" and payload is a RoomEvent.
 */
export function useRoomStateChannel(
  roomCode: string | null,
  onEvent?: (event: RoomEvent) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const onEventRef = useRef(onEvent);
  const isCleaningUpRef = useRef(false);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!roomCode) return;

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

    channel.subscribe("event", (message) => {
      const data = message.data as RoomEvent;
      if (data?.type && onEventRef.current) {
        onEventRef.current(data);
      }
    });

    if (channel.state === "detached" || channel.state === "failed") {
      channel.attach().catch(() => {});
    }

    return () => {
      isCleaningUpRef.current = true;
      channel.unsubscribe();
      channel.detach().catch(() => {});
      client.close();
    };
  }, [roomCode]);

  return { isConnected };
}
