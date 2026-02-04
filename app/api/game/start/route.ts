import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { initializeGameState } from "@/lib/game/engine";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const startGameSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = startGameSchema.parse(body);

    // Find room and verify user is host
    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "lobby") {
      return NextResponse.json(
        { error: "Game has already started" },
        { status: 400 }
      );
    }

    // Verify user is host
    const hostPlayer = room.players.find((p) => p.userId === user.id && p.isHost);
    if (!hostPlayer) {
      return NextResponse.json(
        { error: "Only the host can start the game" },
        { status: 403 }
      );
    }

    if (room.players.length < 2) {
      return NextResponse.json(
        { error: "Need at least 2 players to start" },
        { status: 400 }
      );
    }

    if (!room.sport) {
      return NextResponse.json(
        { error: "Room must have a sport selected" },
        { status: 400 }
      );
    }

    // Get all cards for the sport
    const cards = await prisma.card.findMany({
      where: { sport: room.sport },
    });

    if (cards.length === 0) {
      return NextResponse.json(
        { error: "No cards found for this sport" },
        { status: 500 }
      );
    }

    // Initialize game state
    const playerIds = room.players.map((p) => p.id);
    const gameState = initializeGameState(
      room.id,
      playerIds,
      room.sport as "football" | "basketball"
    );

    // Create game state in database
    const dbGameState = await prisma.gameState.create({
      data: {
        roomId: room.id,
        currentTurnPlayerId: gameState.currentTurnPlayerId,
        deckSeed: gameState.deckSeed,
        activeCardInstanceId: null,
      },
    });

    // Update room status to active
    await prisma.room.update({
      where: { id: room.id },
      data: { status: "active" },
    });

    // Emit game_started event via Ably
    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("game_started", {
        roomCode: room.code,
        currentTurnPlayerId: gameState.currentTurnPlayerId,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      gameState: {
        id: dbGameState.id,
        currentTurnPlayerId: dbGameState.currentTurnPlayerId,
        roomCode: room.code,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error starting game:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
