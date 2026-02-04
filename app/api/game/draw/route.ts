import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { drawNextCard } from "@/lib/game/engine";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const drawCardSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = drawCardSchema.parse(body);

    // Find room
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

    if (!room.gameState) {
      return NextResponse.json(
        { error: "Game state not found" },
        { status: 404 }
      );
    }

    // Verify user is the current turn player
    const currentPlayer = room.players.find((p) => p.id === room.gameState!.currentTurnPlayerId);
    if (!currentPlayer || currentPlayer.userId !== user.id) {
      return NextResponse.json(
        { error: "It's not your turn" },
        { status: 403 }
      );
    }

    // Check hand size limit (max 5 cards)
    const HAND_SIZE_LIMIT = 5;
    const cardsInHand = await prisma.cardInstance.count({
      where: {
        roomId: room.id,
        drawnById: currentPlayer.id,
        status: "drawn", // Only count cards that haven't been submitted/resolved
      },
    });

    if (cardsInHand >= HAND_SIZE_LIMIT) {
      return NextResponse.json(
        {
          error: `You already have ${cardsInHand} cards in your hand. Maximum hand size is ${HAND_SIZE_LIMIT}. Please submit a card before drawing another.`,
        },
        { status: 400 }
      );
    }

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

    // Draw next card
    const { cardIndex } = drawNextCard(gameState);

    if (cardIndex === null) {
      return NextResponse.json(
        { error: "Failed to draw card" },
        { status: 500 }
      );
    }

    const selectedCard = cards[cardIndex];

    // Create card instance
    const cardInstance = await prisma.cardInstance.create({
      data: {
        roomId: room.id,
        cardId: selectedCard.id,
        drawnById: currentPlayer.id,
        status: "drawn",
      },
    });

    // Update game state
    await prisma.gameState.update({
      where: { id: room.gameState.id },
      data: {
        activeCardInstanceId: cardInstance.id,
      },
    });

    // Emit card_drawn event via Ably
    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("card_drawn", {
        roomCode: room.code,
        cardInstanceId: cardInstance.id,
        card: {
          id: selectedCard.id,
          title: selectedCard.title,
          description: selectedCard.description,
          severity: selectedCard.severity,
          type: selectedCard.type,
        },
        drawnBy: {
          id: currentPlayer.id,
          name: currentPlayer.user.name,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      cardInstance: {
        id: cardInstance.id,
        card: {
          id: selectedCard.id,
          title: selectedCard.title,
          description: selectedCard.description,
          severity: selectedCard.severity,
          type: selectedCard.type,
        },
        drawnBy: {
          id: currentPlayer.id,
          name: currentPlayer.user.name,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error drawing card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
