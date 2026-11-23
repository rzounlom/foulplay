import { prisma } from "@/lib/db/prisma";
import {
  ablyRoomChannelName,
  ablyStateChannelName,
} from "@/lib/ably/channels";

const ROOM_CODE_RE = /^[A-Z0-9]{6}$/;

export function normalizeRoomCode(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return ROOM_CODE_RE.test(code) ? code : null;
}

/** Subscribe-only capabilities for the two channels a client may join. */
export function ablySubscribeCapability(
  roomCode: string,
): Record<string, string[]> {
  return {
    [ablyRoomChannelName(roomCode)]: ["subscribe"],
    [ablyStateChannelName(roomCode)]: ["subscribe"],
  };
}

export function userIsRoomMember(opts: {
  userId: string;
  hostId: string;
  playerUserIds: string[];
}): boolean {
  return (
    opts.hostId === opts.userId || opts.playerUserIds.includes(opts.userId)
  );
}

export async function findRoomAccess(
  userId: string,
  roomCode: string,
): Promise<{ allowed: boolean; roomId: string | null }> {
  const room = await prisma.room.findUnique({
    where: { code: roomCode },
    select: {
      id: true,
      hostId: true,
      players: {
        where: { userId },
        select: { userId: true },
      },
    },
  });

  if (!room) {
    return { allowed: false, roomId: null };
  }

  return {
    roomId: room.id,
    allowed: userIsRoomMember({
      userId,
      hostId: room.hostId,
      playerUserIds: room.players.map((player) => player.userId),
    }),
  };
}
