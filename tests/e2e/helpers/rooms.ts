import type { PrismaClient } from "@prisma/client";
import { generateRoomCode } from "../../../lib/rooms/utils";

export type SeedRoomKind =
  | "private_lobby"
  | "private_active"
  | "public_lobby"
  | "public_active";

async function uniqueCode(prisma: PrismaClient): Promise<string> {
  for (let i = 0; i < 12; i++) {
    const code = generateRoomCode();
    const clash = await prisma.room.findUnique({ where: { code } });
    if (!clash) return code;
  }
  throw new Error("Failed to generate unique E2E room code");
}

export async function seedRoom(
  prisma: PrismaClient,
  options: {
    hostUserId: string;
    playerUserIds?: string[];
    kind: SeedRoomKind;
    allowQuarterClearing?: boolean;
    ended?: boolean;
    rematchReadyUserIds?: string[];
  },
): Promise<{ roomId: string; code: string }> {
  const code = await uniqueCode(prisma);
  const isPublic = options.kind.startsWith("public");
  const status = options.ended
    ? "ended"
    : options.kind.endsWith("active")
      ? "active"
      : "lobby";
  const playerIds = [options.hostUserId, ...(options.playerUserIds ?? [])];
  const uniquePlayers = [...new Set(playerIds)];

  const room = await prisma.room.create({
    data: {
      code,
      hostId: options.hostUserId,
      status,
      mode: isPublic ? "party" : "non-drinking",
      sport: "football",
      handSize: 6,
      allowQuarterClearing: options.allowQuarterClearing ?? false,
      allowJoinInProgress: true,
      isPublicChaos: isPublic,
      rematchReadyUserIds: options.rematchReadyUserIds ?? undefined,
      lastGameEndResult: options.ended
        ? {
            winnerId: options.hostUserId,
            winnerName: "Host Free",
            winnerNickname: null,
            winnerPoints: 1,
            leaderboard: uniquePlayers.map((id, i) => ({
              playerId: id,
              name: `Player ${i}`,
              nickname: null,
              points: uniquePlayers.length - i,
            })),
          }
        : undefined,
      players: {
        create: uniquePlayers.map((userId) => ({
          userId,
          isHost: userId === options.hostUserId,
          points: 0,
        })),
      },
    },
  });

  return { roomId: room.id, code: room.code };
}
