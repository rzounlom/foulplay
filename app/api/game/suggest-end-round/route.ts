import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const suggestEndRoundSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = suggestEndRoundSchema.parse(body);

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

    if (!room.allowQuarterClearing) {
      return NextResponse.json(
        { error: "Quarter clearing is not enabled for this room" },
        { status: 400 }
      );
    }

    // Only during normal play (not intermission) — players suggest when stuck
    const isInIntermission =
      room.quarterIntermissionEndsAt &&
      new Date(room.quarterIntermissionEndsAt) > new Date();

    if (isInIntermission) {
      return NextResponse.json(
        { error: "Cannot suggest end round during intermission" },
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

    if (currentPlayer.isHost) {
      return NextResponse.json(
        { error: "Host cannot suggest end round" },
        { status: 400 }
      );
    }

    const rawIds = room.suggestEndRoundPlayerIds;
    const ids = Array.isArray(rawIds)
      ? rawIds
      : rawIds && typeof rawIds === "object"
        ? Object.values(rawIds)
        : [];
    const hasVoted = ids.includes(currentPlayer.id);

    const updated = hasVoted
      ? ids.filter((id) => id !== currentPlayer.id)
      : [...ids, currentPlayer.id];

    await prisma.room.update({
      where: { id: room.id },
      data: {
        suggestEndRoundPlayerIds: updated as Prisma.InputJsonValue,
      },
    });

    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("suggest_end_round_updated", {
        roomCode: room.code,
        playerId: currentPlayer.id,
        voted: !hasVoted,
        voteCount: updated.length,
        totalPlayers: room.players.length,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      voted: !hasVoted,
      voteCount: updated.length,
      totalPlayers: room.players.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error saving suggest end round:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to save", message: errorMessage },
      { status: 500 }
    );
  }
}
