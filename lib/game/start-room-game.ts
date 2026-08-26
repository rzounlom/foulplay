/**
 * Start a game from lobby — used by POST /api/game/start and public chaos auto-start.
 */

import { prisma } from "@/lib/db/prisma";
import {
  initializeGameState,
  drawRandomCardIndicesSmart,
} from "@/lib/game/engine";
import { getRoomChannel } from "@/lib/ably/client";
import { emitPublicChaosEvent } from "@/lib/analytics/public-chaos-events";
import { trackEventFireAndForget } from "@/lib/analytics/track-event";

export async function startRoomGameInternal(opts: {
  roomCode: string;
  actingUserId: string | null;
  /** Skip host check; only for automated starts on isPublicChaos lobbies */
  publicChaosAuto?: boolean;
}): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const roomCode = opts.roomCode.toUpperCase();

  const room = await prisma.room.findUnique({
    where: { code: roomCode },
    include: {
      players: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!room) {
    return { ok: false, error: "Room not found", status: 404 };
  }

  if (room.status !== "lobby") {
    return { ok: false, error: "Game has already started", status: 400 };
  }

  if (opts.publicChaosAuto) {
    if (!room.isPublicChaos) {
      return { ok: false, error: "Not a public chaos room", status: 400 };
    }
  } else {
    if (!opts.actingUserId) {
      return { ok: false, error: "Unauthorized", status: 401 };
    }
    const hostPlayer = room.players.find(
      (p) => p.userId === opts.actingUserId && p.isHost,
    );
    if (!hostPlayer) {
      return {
        ok: false,
        error: "Only the host can start the game",
        status: 403,
      };
    }
  }

  if (room.players.length < 2) {
    return {
      ok: false,
      error: "Need at least 2 players to start",
      status: 400,
    };
  }

  if (!room.sport) {
    return {
      ok: false,
      error: "Room must have a sport selected",
      status: 400,
    };
  }

  const cards = await prisma.card.findMany({
    where: { sport: room.sport },
    orderBy: { id: "asc" },
  });

  if (cards.length === 0) {
    return { ok: false, error: "No cards found for this sport", status: 500 };
  }

  const deckSeed = `${room.id}-${Date.now()}`;
  const playerIds = room.players.map((p) => p.id);
  const gameState = initializeGameState(
    room.id,
    playerIds,
    room.sport as "football" | "basketball",
    deckSeed,
  );

  const handSize = room.handSize || 6;
  const mode = room.mode ?? null;
  const cardInstancesToCreate: Array<{
    roomId: string;
    cardId: string;
    drawnById: string;
    status: string;
  }> = [];

  for (const player of room.players) {
    const cardIndices = drawRandomCardIndicesSmart(
      cards,
      handSize,
      mode,
      handSize,
      [],
    );
    for (const cardIndex of cardIndices) {
      const selectedCard = cards[cardIndex];
      cardInstancesToCreate.push({
        roomId: room.id,
        cardId: selectedCard.id,
        drawnById: player.id,
        status: "drawn",
      });
    }
  }

  const isFootballOrBasketball =
    room.sport === "football" || room.sport === "basketball";

  await prisma.gameState.create({
    data: {
      roomId: room.id,
      currentTurnPlayerId: gameState.currentTurnPlayerId,
      deckSeed: gameState.deckSeed,
      activeCardInstanceId: null,
    },
  });

  if (cardInstancesToCreate.length > 0) {
    await prisma.cardInstance.createMany({ data: cardInstancesToCreate });
  }

  await prisma.room.update({
    where: { id: room.id },
    data: {
      status: "active",
      ...(room.allowQuarterClearing &&
        isFootballOrBasketball && { currentQuarter: "1" }),
    },
  });

  try {
    const channel = getRoomChannel(room.code);
    await channel.publish("game_started", {
      roomCode: room.code,
      currentTurnPlayerId: gameState.currentTurnPlayerId,
      timestamp: new Date().toISOString(),
    });
  } catch (ablyError) {
    console.error("Failed to publish Ably game_started:", ablyError);
  }

  if (room.isPublicChaos) {
    emitPublicChaosEvent("public_room_game_started", {
      roomId: room.id,
      roomCode: room.code,
      playerCount: room.players.length,
      publicChaosAuto: !!opts.publicChaosAuto,
    });
  }

  trackEventFireAndForget({
    name: "game_started",
    userId: opts.actingUserId,
    roomId: room.id,
    props: {
      roomCode: room.code,
      playerCount: room.players.length,
      isPublicChaos: room.isPublicChaos,
      publicChaosAuto: !!opts.publicChaosAuto,
      mode: room.mode,
      sport: room.sport,
    },
  });

  return { ok: true };
}
