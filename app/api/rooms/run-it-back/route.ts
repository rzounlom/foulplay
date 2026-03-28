import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { generateRoomCode } from "@/lib/rooms/utils";
import { z } from "zod";

const bodySchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

/**
 * Create a new lobby room with the same settings and player roster as an ended game.
 * Any player from the ended room may call this; the original host stays host.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = bodySchema.parse(body);
    const codeUpper = roomCode.toUpperCase();

    const source = await prisma.room.findUnique({
      where: { code: codeUpper },
      include: {
        players: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!source) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (source.status !== "ended") {
      return NextResponse.json(
        { error: "Run it back is only available after a game ends" },
        { status: 400 },
      );
    }

    const isMember = source.players.some((p) => p.userId === user.id);
    if (!isMember) {
      return NextResponse.json(
        { error: "You must have played in this room to run it back" },
        { status: 403 },
      );
    }

    if (!source.mode || !source.sport) {
      return NextResponse.json(
        {
          error:
            "This room is missing mode or sport. Create a new room from scratch.",
        },
        { status: 400 },
      );
    }

    let newCode: string = "";
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
      return NextResponse.json(
        { error: "Failed to generate unique room code" },
        { status: 500 },
      );
    }

    const newRoom = await prisma.$transaction(async (tx) => {
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

      for (const p of source.players) {
        await tx.player.create({
          data: {
            userId: p.userId,
            roomId: room.id,
            isHost: p.userId === source.hostId,
            nickname: p.nickname,
            points: 0,
          },
        });
      }

      return room;
    });

    return NextResponse.json(
      { code: newRoom.code, message: "Lobby ready" },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 },
      );
    }
    console.error("run-it-back:", error);
    return NextResponse.json(
      { error: "Failed to run it back" },
      { status: 500 },
    );
  }
}
