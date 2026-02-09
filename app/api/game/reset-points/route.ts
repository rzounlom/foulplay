import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const resetPointsSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = resetPointsSchema.parse(body);

    // Find room and verify user is host
    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Verify user is host
    const hostPlayer = room.players.find((p) => p.userId === user.id && p.isHost);
    if (!hostPlayer) {
      return NextResponse.json(
        { error: "Only the host can reset points" },
        { status: 403 }
      );
    }

    // Reset all player points to 0
    await prisma.player.updateMany({
      where: { roomId: room.id },
      data: { points: 0 },
    });

    // Emit points_reset event via Ably
    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("points_reset", {
        roomCode: room.code,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      message: "All player points have been reset to 0",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error resetting points:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to reset points", message: errorMessage },
      { status: 500 }
    );
  }
}
