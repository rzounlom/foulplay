import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const turnInControlSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
  canTurnInCards: z.boolean(),
});

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode, canTurnInCards } = turnInControlSchema.parse(body);

    // Find room and verify user is host
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
        { error: "Only the host can control card turn-in" },
        { status: 403 }
      );
    }

    // Update room
    const updatedRoom = await prisma.room.update({
      where: { id: room.id },
      data: { canTurnInCards },
    });

    // Emit turn_in_control_changed event
    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("turn_in_control_changed", {
        roomCode: room.code,
        canTurnInCards,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      canTurnInCards: updatedRoom.canTurnInCards,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating turn-in control:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update turn-in control", message: errorMessage },
      { status: 500 }
    );
  }
}
