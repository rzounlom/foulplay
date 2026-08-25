import { prisma } from "@/lib/db/prisma";
import {
  PUBLIC_CHAOS_IDEAL_MAX,
  PUBLIC_CHAOS_IDEAL_MIN,
  PUBLIC_CHAOS_MAX_PLAYERS,
} from "@/lib/game/constants";

const STALE_ROOM_MS = 45 * 60 * 1000;

function activityScore(updatedAt: Date): number {
  const ageMin = (Date.now() - updatedAt.getTime()) / 60_000;
  return Math.max(0, 45 - ageMin) * 2;
}

function idealPlayerScore(n: number): number {
  if (n < PUBLIC_CHAOS_IDEAL_MIN || n >= PUBLIC_CHAOS_MAX_PLAYERS) return 0;
  if (n > PUBLIC_CHAOS_IDEAL_MAX) return 60;
  return 100 - Math.abs(4 - n) * 8;
}

/**
 * Pick the best public chaos room code for drop-in, or null to create new.
 */
export async function pickPublicChaosRoom(_userId: string): Promise<string | null> {
  const active = await prisma.room.findMany({
    where: {
      isPublicChaos: true,
      status: "active",
    },
    include: {
      players: true,
      gameState: true,
    },
  });

  const activeCandidates = active.filter(
    (r) =>
      r.gameState &&
      r.players.length >= PUBLIC_CHAOS_IDEAL_MIN &&
      r.players.length < PUBLIC_CHAOS_MAX_PLAYERS,
  );

  const recentActive = activeCandidates.filter(
    (r) => Date.now() - new Date(r.updatedAt).getTime() <= STALE_ROOM_MS,
  );

  const rankedActive = [...recentActive].sort((a, b) => {
    const sa =
      idealPlayerScore(a.players.length) + activityScore(new Date(a.updatedAt));
    const sb =
      idealPlayerScore(b.players.length) + activityScore(new Date(b.updatedAt));
    return sb - sa;
  });

  if (rankedActive[0]) {
    return rankedActive[0].code;
  }

  const lobby = await prisma.room.findMany({
    where: {
      isPublicChaos: true,
      status: "lobby",
    },
    include: { players: true },
  });

  const lobbyCandidates = lobby.filter(
    (r) =>
      r.sport &&
      r.players.length >= 1 &&
      r.players.length < PUBLIC_CHAOS_MAX_PLAYERS,
  );

  const rankedLobby = [...lobbyCandidates].sort((a, b) => {
    const sa =
      a.players.length * 12 + activityScore(new Date(a.updatedAt));
    const sb =
      b.players.length * 12 + activityScore(new Date(b.updatedAt));
    return sb - sa;
  });

  return rankedLobby[0]?.code ?? null;
}
