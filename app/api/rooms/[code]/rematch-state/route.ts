import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { parseRematchReadyUserIds } from "@/lib/rooms/rematch";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const user = await getCurrentUserFromRequest(_request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await context.params;
    const roomCode = code.toUpperCase();

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
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "ended") {
      return NextResponse.json(
        { error: "Rematch state only exists for ended games" },
        { status: 400 },
      );
    }

    const isMember = room.players.some((p) => p.userId === user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const readyUserIds = parseRematchReadyUserIds(room.rematchReadyUserIds);
    const spawnMembersRaw = room.rematchSpawnMembers;
    const spawnMemberUserIds = Array.isArray(spawnMembersRaw)
      ? spawnMembersRaw.filter((x): x is string => typeof x === "string")
      : [];

    return NextResponse.json({
      readyUserIds,
      totalPlayers: room.players.length,
      roster: room.players.map((p) => ({
        userId: p.userId,
        displayName: p.nickname?.trim() || p.user.name,
        isHost: p.isHost,
      })),
      hostUserId: room.hostId,
      spawnLobbyCode: room.rematchSpawnCode ?? null,
      spawnMemberUserIds,
    });
  } catch (error) {
    console.error("rematch-state GET:", error);
    return NextResponse.json(
      { error: "Failed to load rematch state" },
      { status: 500 },
    );
  }
}
