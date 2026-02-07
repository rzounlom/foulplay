import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { generateRoomCode } from "@/lib/rooms/utils";
import { z } from "zod";

const createRoomSchema = z.object({
  mode: z.string().optional(),
  sport: z.string().optional(),
  handSize: z.number().int().min(4).max(10).optional(),
  allowQuarterClearing: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { mode, sport, handSize, allowQuarterClearing } = createRoomSchema.parse(body);

    // Generate unique room code
    let code: string;
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 10) {
      code = generateRoomCode();
      const existingRoom = await prisma.room.findUnique({
        where: { code },
      });
      exists = !!existingRoom;
      attempts++;
    }

    if (exists) {
      return NextResponse.json(
        { error: "Failed to generate unique room code" },
        { status: 500 }
      );
    }

    // Create room and host player in a transaction
    const room = await prisma.$transaction(async (tx) => {
      const newRoom = await tx.room.create({
        data: {
          code: code!,
          hostId: user.id,
          status: "lobby",
          mode: mode || null,
          sport: sport || null,
          handSize: handSize || 5,
          allowQuarterClearing: allowQuarterClearing || false,
          canTurnInCards: true,
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

      return newRoom;
    });

    // Fetch room with players
    const roomWithPlayers = await prisma.room.findUnique({
      where: { id: room.id },
      include: {
        players: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(roomWithPlayers, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
