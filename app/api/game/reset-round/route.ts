import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const resetRoundSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = resetRoundSchema.parse(body);

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
        { error: "Only the host can reset the round" },
        { status: 403 }
      );
    }

    if (!room.allowQuarterClearing) {
      return NextResponse.json(
        { error: "Round clearing is not enabled for this room" },
        { status: 400 }
      );
    }

    const isFootballOrBasketball =
      room.sport === "football" || room.sport === "basketball";
    if (!isFootballOrBasketball) {
      return NextResponse.json(
        { error: "Round system is only available for football and basketball" },
        { status: 400 }
      );
    }

    if (room.quarterIntermissionEndsAt) {
      const endsAt = new Date(room.quarterIntermissionEndsAt);
      if (endsAt > new Date()) {
        return NextResponse.json(
          { error: "Wait for the current round intermission to end before resetting" },
          { status: 400 }
        );
      }
    }

    await prisma.room.update({
      where: { id: room.id },
      data: { currentQuarter: null },
    });

    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("round_reset", {
        roomCode: room.code,
        currentQuarter: null,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      currentQuarter: null,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error resetting round:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to reset round", message: errorMessage },
      { status: 500 }
    );
  }
}
