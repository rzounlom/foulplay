import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const advanceQuarterSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = advanceQuarterSchema.parse(body);

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
        { error: "Only the host can advance quarters" },
        { status: 403 }
      );
    }

    if (!room.allowQuarterClearing) {
      return NextResponse.json(
        { error: "Quarter clearing is not enabled for this room" },
        { status: 400 }
      );
    }

    // Determine next quarter
    let nextQuarter: string | null;
    if (!room.currentQuarter) {
      nextQuarter = "Q1";
    } else {
      const currentIndex = QUARTERS.indexOf(room.currentQuarter as typeof QUARTERS[number]);
      if (currentIndex === -1 || currentIndex === QUARTERS.length - 1) {
        // If invalid or already at Q4, reset to Q1
        nextQuarter = "Q1";
      } else {
        nextQuarter = QUARTERS[currentIndex + 1];
      }
    }

    // Update room
    const updatedRoom = await prisma.room.update({
      where: { id: room.id },
      data: { currentQuarter: nextQuarter },
    });

    // Emit quarter_advanced event
    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("quarter_advanced", {
        roomCode: room.code,
        currentQuarter: nextQuarter,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      currentQuarter: updatedRoom.currentQuarter,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error advancing quarter:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to advance quarter", message: errorMessage },
      { status: 500 }
    );
  }
}
