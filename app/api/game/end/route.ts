import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { initializeGameState, drawMultipleCards } from "@/lib/game/engine";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const endGameSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = endGameSchema.parse(body);

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
        gameState: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "active") {
      return NextResponse.json(
        { error: "Game is not active" },
        { status: 400 }
      );
    }

    // Verify user is host
    const hostPlayer = room.players.find((p) => p.userId === user.id && p.isHost);
    if (!hostPlayer) {
      return NextResponse.json(
        { error: "Only the host can end the game" },
        { status: 403 }
      );
    }

    // Determine winner (player with highest points)
    const winner = room.players.reduce((prev, current) =>
      (current.points > prev.points) ? current : prev
    );

    // Build leaderboard (descending by points) for end-game page
    const leaderboard = [...room.players]
      .sort((a, b) => b.points - a.points)
      .map((p) => ({
        playerId: p.id,
        name: p.user.name,
        nickname: p.nickname,
        points: p.points,
      }));

    const lastGameEndResult = {
      winnerId: winner.id,
      winnerName: winner.user.name,
      winnerNickname: winner.nickname,
      winnerPoints: winner.points,
      leaderboard,
    };

    // Store result so end-game page can display it (before we reset points)
    await prisma.room.update({
      where: { id: room.id },
      data: { lastGameEndResult: lastGameEndResult as object },
    });

    // Update user stats for all players
    await Promise.all(
      room.players.map(async (player) => {
        const userRecord = await prisma.user.findUnique({
          where: { id: player.userId },
        });

        if (userRecord) {
          await prisma.user.update({
            where: { id: player.userId },
            data: {
              gamesPlayed: { increment: 1 },
              gamesWon: player.id === winner.id ? { increment: 1 } : undefined,
              totalPoints: { increment: player.points },
            },
          });
        }
      })
    );

    // Delete old game state and card instances
    if (room.gameState) {
      await prisma.gameState.delete({
        where: { id: room.gameState.id },
      });
    }

    // Delete all card instances for this room
    await prisma.cardInstance.deleteMany({
      where: { roomId: room.id },
    });

    // Delete all submissions for this room
    await prisma.cardSubmission.deleteMany({
      where: { roomId: room.id },
    });

    // Reset all player points to 0
    await prisma.player.updateMany({
      where: { roomId: room.id },
      data: { points: 0 },
    });

    // Get all cards for the sport
    const cards = await prisma.card.findMany({
      where: { sport: room.sport! },
      orderBy: { id: "asc" },
    });

    if (cards.length === 0) {
      return NextResponse.json(
        { error: "No cards found for this sport" },
        { status: 500 }
      );
    }

    // Initialize new game state
    const playerIds = room.players.map((p) => p.id);
    const gameState = initializeGameState(
      room.id,
      playerIds,
      room.sport as "football" | "basketball"
    );

    // Create new game state in database
    await prisma.gameState.create({
      data: {
        roomId: room.id,
        currentTurnPlayerId: gameState.currentTurnPlayerId,
        deckSeed: gameState.deckSeed,
        activeCardInstanceId: null,
      },
    });

    // Deal cards to each player based on room handSize
    const handSize = room.handSize || 5;
    let currentGameState = gameState;
    const cardInstancesToCreate: Array<{
      roomId: string;
      cardId: string;
      drawnById: string;
      status: string;
    }> = [];

    for (const player of room.players) {
      // Draw cards for this player
      const { cardIndices, newState } = drawMultipleCards(currentGameState, handSize);
      currentGameState = newState;

      // Create card instances for each drawn card
      for (const cardIndex of cardIndices) {
        const selectedCard = cards[cardIndex];
        cardInstancesToCreate.push({
          roomId: room.id,
          cardId: selectedCard.id,
          drawnById: player.id,
          status: "drawn",
        });
      }
    }

    // Create all card instances in database
    if (cardInstancesToCreate.length > 0) {
      await prisma.cardInstance.createMany({
        data: cardInstancesToCreate,
      });
    }

    // Room status stays "active" (new game started)

    // Emit game_ended and game_started events via Ably
    try {
      const channel = getRoomChannel(room.code);
      
      // Emit game ended event with winner info
      await channel.publish("game_ended", {
        roomCode: room.code,
        winner: {
          id: winner.id,
          name: winner.user.name,
          nickname: winner.nickname,
          points: winner.points,
        },
        timestamp: new Date().toISOString(),
      });

      // Emit game started event for new game
      await channel.publish("game_started", {
        roomCode: room.code,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      winner: {
        id: winner.id,
        name: winner.user.name,
        nickname: winner.nickname,
        points: winner.points,
      },
      message: "Game ended and new game started",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error ending game:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { error: "Failed to end game", message: errorMessage, stack: errorStack },
      { status: 500 }
    );
  }
}
