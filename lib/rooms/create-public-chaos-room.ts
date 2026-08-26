import { prisma } from "@/lib/db/prisma";
import { generateRoomCode } from "@/lib/rooms/utils";
import { emitPublicChaosEvent } from "@/lib/analytics/public-chaos-events";
import { trackEventFireAndForget } from "@/lib/analytics/track-event";

/**
 * New drop-in lobby: one host player, defaults suitable for instant matchmaking.
 */
export async function createPublicChaosLobbyRoom(user: {
  id: string;
}): Promise<{ id: string; code: string }> {
  let code = "";
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    code = generateRoomCode();
    const existingRoom = await prisma.room.findUnique({ where: { code } });
    exists = !!existingRoom;
    attempts++;
  }

  if (exists) {
    throw new Error("Failed to generate unique room code");
  }

  const out = await prisma.$transaction(async (tx) => {
    const newRoom = await tx.room.create({
      data: {
        code,
        hostId: user.id,
        status: "lobby",
        mode: "party",
        sport: "football",
        handSize: 6,
        allowJoinInProgress: true,
        allowQuarterClearing: false,
        canTurnInCards: true,
        showPoints: true,
        isPublicChaos: true,
      },
    });

    await tx.player.create({
      data: {
        userId: user.id,
        roomId: newRoom.id,
        isHost: true,
        points: 0,
      },
    });

    return { id: newRoom.id, code: newRoom.code };
  });

  emitPublicChaosEvent("public_room_created", {
    roomId: out.id,
    roomCode: out.code,
    playerCount: 1,
    createdVia: "matchmaking",
    hostUserId: user.id,
  });

  trackEventFireAndForget({
    name: "room_created",
    userId: user.id,
    roomId: out.id,
    props: {
      roomCode: out.code,
      isPublicChaos: true,
      createdVia: "matchmaking",
      mode: "party",
      sport: "football",
    },
  });

  return out;
}
