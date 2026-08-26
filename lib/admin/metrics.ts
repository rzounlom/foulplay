import { prisma } from "@/lib/db/prisma";
import {
  GAME_ENDED_EVENT_NAMES,
  GAME_STARTED_EVENT_NAMES,
  ROOM_CREATED_EVENT_NAMES,
  ROOM_JOINED_EVENT_NAMES,
} from "@/lib/analytics/events";

export type MetricsRange = "24h" | "7d" | "30d";

export function parseMetricsRange(value: string | null): MetricsRange {
  if (value === "24h" || value === "30d") return value;
  return "7d";
}

function rangeStart(range: MetricsRange): Date {
  const hours = range === "24h" ? 24 : range === "7d" ? 24 * 7 : 24 * 30;
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buildDaySeries(
  start: Date,
  days: number,
  counts: Map<string, number>,
): { date: string; count: number }[] {
  const out: { date: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    d.setUTCDate(d.getUTCDate() - i);
    const key = dayKey(d);
    out.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return out;
}

export async function getAdminMetrics(range: MetricsRange) {
  const start = rangeStart(range);
  const days = range === "24h" ? 1 : range === "7d" ? 7 : 30;
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [
    signupsPeriod,
    signupsToday,
    totalUsers,
    ageGateCompleted,
    is21PlusCount,
    liveGames,
    livePlayers,
    gamesStartedPeriod,
    gamesEndedPeriod,
    roomsCreatedPeriod,
    roomsJoinedPeriod,
    submissionsPeriod,
    dropInPeriod,
    signupRows,
    startedEventRows,
    endedEventRows,
    eventNameGroups,
    liveRoomRows,
    modeGroups,
    sportGroups,
    publicPrivateGroups,
    activeUserIdsFromEvents,
    activeUserIdsFromPlayers,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: start } } }),
    prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.user.count(),
    prisma.user.count({ where: { ageConfirmedAt: { not: null } } }),
    prisma.user.count({ where: { is21Plus: true } }),
    prisma.room.count({ where: { status: "active" } }),
    prisma.player.count({ where: { room: { status: "active" } } }),
    prisma.analyticsEvent.count({
      where: { name: { in: [...GAME_STARTED_EVENT_NAMES] }, createdAt: { gte: start } },
    }),
    prisma.analyticsEvent.count({
      where: { name: { in: [...GAME_ENDED_EVENT_NAMES] }, createdAt: { gte: start } },
    }),
    prisma.analyticsEvent.count({
      where: { name: { in: [...ROOM_CREATED_EVENT_NAMES] }, createdAt: { gte: start } },
    }),
    prisma.analyticsEvent.count({
      where: { name: { in: [...ROOM_JOINED_EVENT_NAMES] }, createdAt: { gte: start } },
    }),
    prisma.analyticsEvent.count({
      where: { name: "submission_created", createdAt: { gte: start } },
    }),
    prisma.analyticsEvent.count({
      where: { name: "drop_in_matched", createdAt: { gte: start } },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: start } },
      select: { createdAt: true },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        name: { in: [...GAME_STARTED_EVENT_NAMES] },
        createdAt: { gte: start },
      },
      select: { createdAt: true },
    }),
    prisma.analyticsEvent.findMany({
      where: {
        name: { in: [...GAME_ENDED_EVENT_NAMES] },
        createdAt: { gte: start },
      },
      select: { createdAt: true },
    }),
    prisma.analyticsEvent.groupBy({
      by: ["name"],
      where: { createdAt: { gte: start } },
      _count: { name: true },
      orderBy: { _count: { name: "desc" } },
    }),
    prisma.room.findMany({
      where: { status: "active" },
      select: {
        code: true,
        mode: true,
        sport: true,
        isPublicChaos: true,
        createdAt: true,
        _count: { select: { players: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.room.groupBy({
      by: ["mode"],
      where: { createdAt: { gte: start } },
      _count: { mode: true },
    }),
    prisma.room.groupBy({
      by: ["sport"],
      where: { createdAt: { gte: start } },
      _count: { sport: true },
    }),
    prisma.room.groupBy({
      by: ["isPublicChaos"],
      where: { createdAt: { gte: start } },
      _count: { isPublicChaos: true },
    }),
    prisma.analyticsEvent.findMany({
      where: { userId: { not: null }, createdAt: { gte: start } },
      select: { userId: true },
      distinct: ["userId"],
    }),
    prisma.player.findMany({
      where: { createdAt: { gte: start } },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const signupByDay = new Map<string, number>();
  for (const row of signupRows) {
    const key = dayKey(row.createdAt);
    signupByDay.set(key, (signupByDay.get(key) ?? 0) + 1);
  }

  const startedByDay = new Map<string, number>();
  for (const row of startedEventRows) {
    const key = dayKey(row.createdAt);
    startedByDay.set(key, (startedByDay.get(key) ?? 0) + 1);
  }

  const endedByDay = new Map<string, number>();
  for (const row of endedEventRows) {
    const key = dayKey(row.createdAt);
    endedByDay.set(key, (endedByDay.get(key) ?? 0) + 1);
  }

  const dauSet = new Set<string>();
  for (const row of activeUserIdsFromEvents) {
    if (row.userId) dauSet.add(row.userId);
  }
  for (const row of activeUserIdsFromPlayers) {
    dauSet.add(row.userId);
  }

  const gamesByDay =
    range === "24h"
      ? []
      : Array.from({ length: days }, (_, i) => {
          const d = new Date();
          d.setUTCHours(0, 0, 0, 0);
          d.setUTCDate(d.getUTCDate() - (days - 1 - i));
          const key = dayKey(d);
          return {
            date: key,
            started: startedByDay.get(key) ?? 0,
            ended: endedByDay.get(key) ?? 0,
          };
        });

  const completionRate =
    gamesStartedPeriod > 0
      ? Math.round((gamesEndedPeriod / gamesStartedPeriod) * 100)
      : null;

  return {
    range,
    generatedAt: new Date().toISOString(),
    overview: {
      signupsToday,
      signupsPeriod,
      totalUsers,
      activeUsersPeriod: dauSet.size,
      liveGames,
      livePlayers,
      gamesStartedPeriod,
      gamesEndedPeriod,
      completionRate,
      roomsCreatedPeriod,
      roomsJoinedPeriod,
      submissionsPeriod,
      dropInPeriod,
      ageGateCompleted,
      is21PlusCount,
    },
    signupsByDay: buildDaySeries(start, days, signupByDay),
    gamesByDay,
    eventCounts: eventNameGroups.map((g) => ({
      name: g.name,
      count: g._count.name,
    })),
    liveRooms: liveRoomRows.map((r) => ({
      code: r.code,
      mode: r.mode,
      sport: r.sport,
      isPublicChaos: r.isPublicChaos,
      playerCount: r._count.players,
      startedAt: r.createdAt.toISOString(),
    })),
    productMix: {
      modes: Object.fromEntries(
        modeGroups.map((g) => [g.mode ?? "unset", g._count.mode]),
      ),
      sports: Object.fromEntries(
        sportGroups.map((g) => [g.sport ?? "unset", g._count.sport]),
      ),
      publicVsPrivate: {
        public: publicPrivateGroups.find((g) => g.isPublicChaos)?._count.isPublicChaos ?? 0,
        private:
          publicPrivateGroups.find((g) => !g.isPublicChaos)?._count.isPublicChaos ?? 0,
      },
    },
  };
}

export type AdminMetrics = Awaited<ReturnType<typeof getAdminMetrics>>;
