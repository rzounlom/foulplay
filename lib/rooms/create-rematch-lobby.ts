import { prisma } from "@/lib/db/prisma";
import { generateRoomCode } from "@/lib/rooms/utils";

/**
 * Creates a new lobby from an ended room, adding only the listed users (in roster order).
 * Clears rematchReadyUserIds on the source room. Caller must validate inputs.
 */
export async function createRematchLobbyFromEndedRoom(options: {
  sourceRoomId: string;
  /** userIds to add; typically stable order from original room.players (createdAt) */
  participantUserIdsOrdered: string[];
}): Promise<{ code: string; memberUserIds: string[] }> {
  const { sourceRoomId, participantUserIdsOrdered } = options;
  const ordered = [...participantUserIdsOrdered];
  if (ordered.length === 0) {
    throw new Error("NO_PARTICIPANTS");
  }

  const source = await prisma.room.findUnique({
    where: { id: sourceRoomId },
    include: {
      players: { include: { user: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!source) {
    throw new Error("NOT_FOUND");
  }
  if (source.status !== "ended") {
    throw new Error("NOT_ENDED");
  }
  if (!source.mode || !source.sport) {
    throw new Error("MISSING_SETTINGS");
  }

  const memberSet = new Set(source.players.map((p) => p.userId));
  const finalOrder = ordered.filter((id) => memberSet.has(id));
  if (finalOrder.length === 0) {
    throw new Error("NO_PARTICIPANTS");
  }

  let newCode = "";
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    newCode = generateRoomCode();
    const clash = await prisma.room.findUnique({
      where: { code: newCode },
      select: { id: true },
    });
    exists = !!clash;
    attempts++;
  }
  if (exists) {
    throw new Error("CODE_GEN_FAILED");
  }

  const nicknameByUserId = new Map(
    source.players.map((p) => [p.userId, p.nickname] as const),
  );

  await prisma.$transaction(async (tx) => {
    const room = await tx.room.create({
      data: {
        code: newCode,
        hostId: source.hostId,
        status: "lobby",
        mode: source.mode,
        sport: source.sport,
        handSize: source.handSize,
        allowQuarterClearing: source.allowQuarterClearing,
        showPoints: source.showPoints,
        allowJoinInProgress: source.allowJoinInProgress,
        canTurnInCards: true,
      },
    });

    for (const userId of finalOrder) {
      await tx.player.create({
        data: {
          userId,
          roomId: room.id,
          isHost: userId === source.hostId,
          nickname: nicknameByUserId.get(userId) ?? null,
          points: 0,
        },
      });
    }

    await tx.room.update({
      where: { id: source.id },
      data: {
        rematchReadyUserIds: [],
        rematchSpawnCode: newCode,
        rematchSpawnMembers: finalOrder,
      },
    });
  });

  return { code: newCode, memberUserIds: finalOrder };
}
