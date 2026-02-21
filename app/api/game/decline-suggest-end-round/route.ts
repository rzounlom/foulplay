import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const declineSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = declineSchema.parse(body);

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: {
          include: { user: true },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const currentPlayer = room.players.find((p) => p.userId === user.id);
    if (!currentPlayer) {
      return NextResponse.json(
        { error: "You are not a player in this room" },
        { status: 403 }
      );
    }

    if (!currentPlayer.isHost) {
      return NextResponse.json(
        { error: "Only the host can decline the suggest end round" },
        { status: 403 }
      );
    }

    const rawIds = room.suggestEndRoundPlayerIds;
    const declinedPlayerIds = Array.isArray(rawIds)
      ? rawIds
      : rawIds && typeof rawIds === "object"
        ? Object.values(rawIds)
        : [];

    await prisma.room.update({
      where: { id: room.id },
      data: {
        suggestEndRoundPlayerIds: [] as Prisma.InputJsonValue,
      },
    });

    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("suggest_end_round_declined", {
        roomCode: room.code,
        declinedPlayerIds,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      declinedCount: declinedPlayerIds.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error declining suggest end round:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to decline", message: errorMessage },
      { status: 500 }
    );
  }
}
