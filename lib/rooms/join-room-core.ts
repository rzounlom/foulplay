import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { publishRoomEvent } from "@/lib/realtime/publish-room-event";
import { drawRandomCardIndicesSmart } from "@/lib/game/engine";
import { startRoomGameInternal } from "@/lib/game/start-room-game";
import { PUBLIC_CHAOS_MAX_PLAYERS } from "@/lib/game/constants";
import { roomAllowsMidGameJoin } from "@/lib/rooms/public-chaos-invariant";
import {
  emitPublicChaosEvent,
  type PublicChaosJoinSource,
} from "@/lib/analytics/public-chaos-events";
import { assertDrinkingModeAccess } from "@/lib/user/age-gate";
import { trackEventFireAndForget } from "@/lib/analytics/track-event";

export type JoinRoomUser = { id: string; name: string };

export type JoinRoomCoreOptions = {
  joinSource?: PublicChaosJoinSource;
};

/**
 * Shared join logic for POST /api/rooms/join and public drop-in matchmaking.
 */
export async function joinRoomCore(
  user: JoinRoomUser,
  code: string,
  nickname?: string | null,
  options?: JoinRoomCoreOptions,
): Promise<
  | {
      ok: true;
      room: NonNullable<Awaited<ReturnType<typeof fetchJoinedRoom>>>;
    }
  | { ok: false; status: number; error: string }
> {
  const upper = code.toUpperCase();

  const room = await prisma.room.findUnique({
    where: { code: upper },
    include: {
      players: {
        include: { user: true },
      },
      gameState: true,
    },
  });

  if (!room) {
    return { ok: false, status: 404, error: "Room not found" };
  }

  if (room.status === "ended") {
    return { ok: false, status: 400, error: "This game has ended" };
  }

  if (!roomAllowsMidGameJoin(room)) {
    return {
      ok: false,
      status: 400,
      error: "Room is not accepting new players",
    };
  }

  const existingPlayer = await prisma.player.findUnique({
    where: {
      userId_roomId: { userId: user.id, roomId: room.id },
    },
  });

  if (existingPlayer) {
    const r = await fetchJoinedRoom(room.id);
    if (!r) return { ok: false, status: 500, error: "Failed to load room" };
    return { ok: true, room: r };
  }

  const drinkingAccess = await assertDrinkingModeAccess(user.id, room.mode);
  if (!drinkingAccess.ok) {
    return { ok: false, status: 403, error: drinkingAccess.error };
  }

  if (
    room.isPublicChaos &&
    room.players.length >= PUBLIC_CHAOS_MAX_PLAYERS
  ) {
    return {
      ok: false,
      status: 400,
      error: "This live game is full",
    };
  }

  const newPlayer = await prisma.player.create({
    data: {
      userId: user.id,
      roomId: room.id,
      isHost: false,
      points: 0,
      nickname: nickname?.trim() || null,
    },
  });

  const gameState = room.gameState;
  if (room.status === "active" && gameState && room.sport) {
    const cards = await prisma.card.findMany({
      where: { sport: room.sport },
      orderBy: { id: "asc" },
    });
    if (cards.length > 0) {
      const handSize = room.handSize ?? 6;
      const mode = room.mode ?? null;
      const cardIndices = drawRandomCardIndicesSmart(
        cards,
        handSize,
        mode,
        handSize,
        [],
      );
      const cardInstancesToCreate = cardIndices.map((cardIndex) => ({
        roomId: room.id,
        cardId: cards[cardIndex].id,
        drawnById: newPlayer.id,
        status: "drawn",
      }));
      if (cardInstancesToCreate.length > 0) {
        await prisma.cardInstance.createMany({ data: cardInstancesToCreate });
      }
    }
  }

  const updatedRoomForVersion = await prisma.room.update({
    where: { id: room.id },
    data: { version: { increment: 1 } },
    select: { version: true },
  });

  try {
    const displayName =
      (nickname?.trim() || null) ?? user.name ?? "Player";
    await publishRoomEvent({
      type: "player.joined",
      roomId: room.id,
      roomCode: room.code,
      version: updatedRoomForVersion.version,
      playerId: newPlayer.id,
      displayName,
    });
  } catch (publishError) {
    console.error("Failed to publish player.joined:", publishError);
  }

  try {
    const channel = getRoomChannel(room.code);
    await channel.publish("player_joined", {
      playerId: user.id,
      playerName: user.name,
      nickname: nickname?.trim() || null,
      roomCode: room.code,
      timestamp: new Date().toISOString(),
    });
  } catch (ablyError) {
    console.error("Failed to publish Ably player_joined:", ablyError);
  }

  const after = await prisma.room.findUnique({
    where: { id: room.id },
    include: { players: true },
  });

  if (room.isPublicChaos && after) {
    emitPublicChaosEvent("public_room_joined", {
      roomId: room.id,
      roomCode: room.code,
      playerCount: after.players.length,
      joinSource: options?.joinSource ?? "invite_link",
      roomStatusAtJoin: room.status,
    });
  }

  if (after) {
    trackEventFireAndForget({
      name: "room_joined",
      userId: user.id,
      roomId: room.id,
      props: {
        roomCode: room.code,
        playerCount: after.players.length,
        joinSource: options?.joinSource ?? "invite_link",
        isPublicChaos: room.isPublicChaos,
        roomStatusAtJoin: room.status,
      },
    });
  }

  if (
    after?.isPublicChaos &&
    after.status === "lobby" &&
    after.players.length >= 2 &&
    after.sport
  ) {
    const started = await startRoomGameInternal({
      roomCode: after.code,
      actingUserId: null,
      publicChaosAuto: true,
    });
    if (!started.ok && process.env.NODE_ENV === "development") {
      console.warn("[joinRoomCore] Public chaos auto-start:", started.error);
    }
  }

  const updatedRoom = await fetchJoinedRoom(room.id);
  if (!updatedRoom) {
    return { ok: false, status: 500, error: "Failed to load room" };
  }
  return { ok: true, room: updatedRoom };
}

async function fetchJoinedRoom(roomId: string) {
  return prisma.room.findUnique({
    where: { id: roomId },
    include: {
      players: {
        include: { user: true },
      },
    },
  });
}
