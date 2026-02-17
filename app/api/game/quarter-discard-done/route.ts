import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const quarterDiscardDoneSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = quarterDiscardDoneSchema.parse(body);

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

    const isInIntermission =
      room.quarterIntermissionEndsAt &&
      new Date(room.quarterIntermissionEndsAt) > new Date();

    if (!isInIntermission) {
      return NextResponse.json(
        { error: "Quarter intermission is not active" },
        { status: 400 }
      );
    }

    const currentPlayer = room.players.find((p) => p.userId === user.id);
    if (!currentPlayer) {
      return NextResponse.json(
        { error: "You are not a player in this room" },
        { status: 403 }
      );
    }

    const doneIds = (room.quarterDiscardDonePlayerIds as string[]) ?? [];
    const isDone = doneIds.includes(currentPlayer.id);

    const updated = isDone
      ? doneIds.filter((id) => id !== currentPlayer.id)
      : [...doneIds, currentPlayer.id];

    await prisma.room.update({
      where: { id: room.id },
      data: { quarterDiscardDonePlayerIds: updated },
    });

    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("quarter_discard_done_updated", {
        roomCode: room.code,
        playerId: currentPlayer.id,
        done: !isDone,
        doneCount: updated.length,
        totalPlayers: room.players.length,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      done: !isDone,
      doneCount: updated.length,
      totalPlayers: room.players.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error saving quarter discard done:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to save", message: errorMessage },
      { status: 500 }
    );
  }
}
