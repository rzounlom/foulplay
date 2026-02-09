import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const INTERMISSION_MINUTES = 5;

const endQuarterSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = endQuarterSchema.parse(body);

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: {
          where: { userId: user.id, isHost: true },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.players.length === 0) {
      return NextResponse.json(
        { error: "Only the host can end the quarter" },
        { status: 403 }
      );
    }

    if (!room.allowQuarterClearing) {
      return NextResponse.json(
        { error: "Quarter clearing is not enabled for this room" },
        { status: 400 }
      );
    }

    const isFootballOrBasketball =
      room.sport === "football" || room.sport === "basketball";
    if (!isFootballOrBasketball) {
      return NextResponse.json(
        { error: "Quarter system is only available for football and basketball" },
        { status: 400 }
      );
    }

    // If intermission already in progress, do not start another
    if (room.quarterIntermissionEndsAt) {
      const endsAt = new Date(room.quarterIntermissionEndsAt);
      if (endsAt > new Date()) {
        return NextResponse.json(
          { error: "Quarter intermission is already in progress" },
          { status: 400 }
        );
      }
    }

    const endsAt = new Date(Date.now() + INTERMISSION_MINUTES * 60 * 1000);

    const updatedRoom = await prisma.room.update({
      where: { id: room.id },
      data: { quarterIntermissionEndsAt: endsAt },
    });

    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("quarter_ending", {
        roomCode: room.code,
        endsAt: endsAt.toISOString(),
        currentQuarter: room.currentQuarter,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      endsAt: updatedRoom.quarterIntermissionEndsAt?.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error starting quarter end:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to start quarter end", message: errorMessage },
      { status: 500 }
    );
  }
}
