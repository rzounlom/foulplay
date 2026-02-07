import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const quarterDiscardSelectionSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
  cardInstanceIds: z.array(z.string()), // Can be empty to clear selection
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode, cardInstanceIds } =
      quarterDiscardSelectionSchema.parse(body);

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

    const handSize = room.handSize ?? 5;
    if (cardInstanceIds.length > handSize) {
      return NextResponse.json(
        {
          error: `You can select at most ${handSize} cards (your hand size) to turn in.`,
        },
        { status: 400 }
      );
    }

    if (cardInstanceIds.length > 0) {
      const validInstances = await prisma.cardInstance.findMany({
        where: {
          id: { in: cardInstanceIds },
          roomId: room.id,
          drawnById: currentPlayer.id,
          status: "drawn",
        },
      });
      if (validInstances.length !== cardInstanceIds.length) {
        return NextResponse.json(
          {
            error:
              "One or more selected cards are not in your hand or invalid.",
          },
          { status: 400 }
        );
      }
    }

    const pending = (room.pendingQuarterDiscardSelections as Record<string, string[]>) ?? {};
    const updated = { ...pending, [currentPlayer.id]: cardInstanceIds };

    await prisma.room.update({
      where: { id: room.id },
      data: { pendingQuarterDiscardSelections: updated },
    });

    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("quarter_discard_selection_updated", {
        roomCode: room.code,
        playerId: currentPlayer.id,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      selectedCount: cardInstanceIds.length,
      message:
        cardInstanceIds.length === 0
          ? "Selection cleared. You will keep all cards when the quarter ends."
          : `${cardInstanceIds.length} card(s) will be turned in when the quarter ends (drink penalty applies).`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error saving quarter discard selection:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to save selection", message: errorMessage },
      { status: 500 }
    );
  }
}
