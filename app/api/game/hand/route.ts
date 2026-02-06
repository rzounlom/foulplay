import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const getHandSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get("roomCode");

    if (!roomCode) {
      return NextResponse.json(
        { error: "roomCode is required" },
        { status: 400 }
      );
    }

    const parsed = getHandSchema.parse({ roomCode });

    // Find room
    const room = await prisma.room.findUnique({
      where: { code: parsed.roomCode.toUpperCase() },
      include: {
        players: {
          where: { userId: user.id },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const player = room.players[0];
    if (!player) {
      return NextResponse.json(
        { error: "You are not a player in this room" },
        { status: 403 }
      );
    }

    // Get player's cards in hand (status = "drawn")
    const cardsInHand = await prisma.cardInstance.findMany({
      where: {
        roomId: room.id,
        drawnById: player.id,
        status: "drawn",
      },
      include: {
        card: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({
      cards: cardsInHand,
      handSize: cardsInHand.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error fetching hand:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
