import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";
import { drawMultipleCards } from "@/lib/game/engine";

const discardCardSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
  cardInstanceIds: z.array(z.string()).min(1, "At least one card must be discarded"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode, cardInstanceIds } = discardCardSchema.parse(body);

    // Find room and verify game is active
    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: {
          include: {
            user: true,
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

    // Verify user is a player in the room
    const currentPlayer = room.players.find((p) => p.userId === user.id);
    if (!currentPlayer) {
      return NextResponse.json(
        { error: "You are not a player in this room" },
        { status: 403 }
      );
    }

    // During quarter intermission, use "turn in at end of quarter" selection instead of immediate discard
    const isInIntermission =
      room.quarterIntermissionEndsAt &&
      new Date(room.quarterIntermissionEndsAt) > new Date();

    if (isInIntermission) {
      return NextResponse.json(
        {
          error:
            "During the quarter-ending window, select cards to turn in and confirm. They will be processed when the intermission ends. Use “Turn in at end of quarter” to set your selection.",
        },
        { status: 400 }
      );
    }

    if (room.allowQuarterClearing && !room.currentQuarter) {
      return NextResponse.json(
        { error: "Quarter clearing is enabled but no quarter is active" },
        { status: 400 }
      );
    }

    // Find all card instances to discard
    const cardInstances = await prisma.cardInstance.findMany({
      where: {
        id: { in: cardInstanceIds },
        roomId: room.id,
        drawnById: currentPlayer.id,
        status: "drawn", // Only can discard cards in hand
      },
      include: {
        card: true,
      },
    });

    if (cardInstances.length !== cardInstanceIds.length) {
      return NextResponse.json(
        { error: "One or more cards are not valid for discarding" },
        { status: 400 }
      );
    }

    // Update card instances to "discarded" status
    await prisma.cardInstance.updateMany({
      where: {
        id: { in: cardInstanceIds },
      },
      data: {
        status: "discarded",
      },
    });

    // During quarter intermission, discarded cards count as approved: add points to player
    const pointsToAdd =
      isInIntermission && cardInstances.length > 0
        ? cardInstances.reduce(
            (sum, ci) => sum + (ci.card?.points ?? 0),
            0
          )
        : 0;
    if (pointsToAdd > 0) {
      await prisma.player.update({
        where: { id: currentPlayer.id },
        data: { points: currentPlayer.points + pointsToAdd },
      });
    }

    // Draw new cards to replace discarded ones (cap at handSize so we never exceed max)
    if (room.gameState && room.sport) {
      const handSize = room.handSize ?? 5;
      const drawnCountAfterDiscard = await prisma.cardInstance.count({
        where: {
          roomId: room.id,
          drawnById: currentPlayer.id,
          status: "drawn",
        },
      });
      const cardsToDeal = Math.min(
        cardInstances.length,
        Math.max(0, handSize - drawnCountAfterDiscard)
      );

      if (cardsToDeal > 0) {
        const cards = await prisma.card.findMany({
          where: { sport: room.sport },
          orderBy: { id: "asc" },
        });

        if (cards.length > 0) {
          // Get all drawn card instances to determine which cards have been used
          const drawnInstances = await prisma.cardInstance.findMany({
            where: { roomId: room.id },
            include: { card: true },
          });

          // Map card IDs to their indices in the sorted cards array
          const cardIdToIndex = new Map(cards.map((card, index) => [card.id, index]));
          const drawnCardIndices = drawnInstances
            .map((instance) => cardIdToIndex.get(instance.cardId))
            .filter((index): index is number => index !== undefined);

          // Reconstruct game state for engine
          const gameState = {
            roomId: room.id,
            currentTurnPlayerId: room.gameState.currentTurnPlayerId,
            activeCardInstanceId: room.gameState.activeCardInstanceId || null,
            deckSeed: room.gameState.deckSeed,
            deck: Array.from({ length: cards.length }, (_, i) => i),
            drawnCards: drawnCardIndices,
          };

          // Draw new cards (only up to handSize)
          const { cardIndices, newState } = drawMultipleCards(gameState, cardsToDeal);

        // Create new card instances
        const newCardInstances = cardIndices.map((cardIndex) => ({
          roomId: room.id,
          cardId: cards[cardIndex].id,
          drawnById: currentPlayer.id,
          status: "drawn",
        }));

        if (newCardInstances.length > 0) {
          await prisma.cardInstance.createMany({
            data: newCardInstances,
          });
        }

        // Update game state
        await prisma.gameState.update({
          where: { id: room.gameState.id },
          data: {
            deckSeed: newState.deckSeed,
          },
        });
        }
      }
    }

    // Emit card_discarded event via Ably (include pointsAwarded so clients refresh scores)
    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("card_discarded", {
        roomCode: room.code,
        playerId: currentPlayer.id,
        playerName: currentPlayer.user.name,
        playerNickname: currentPlayer.nickname,
        cardInstanceIds: cardInstanceIds,
        cardCount: cardInstances.length,
        pointsAwarded: pointsToAdd > 0 ? pointsToAdd : undefined,
        cards: cardInstances.map((ci) => ({
          id: ci.card.id,
          title: ci.card.title,
          description: ci.card.description,
        })),
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      message: `Discarded ${cardInstances.length} card(s). New cards have been drawn.`,
      discardedCount: cardInstances.length,
      ...(pointsToAdd > 0 && { pointsAwarded: pointsToAdd }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error discarding cards:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to discard cards", message: errorMessage },
      { status: 500 }
    );
  }
}
