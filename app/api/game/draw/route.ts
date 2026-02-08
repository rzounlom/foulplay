import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import {
  drawNextCard,
  generateDeckForMode,
  type GameMode,
} from "@/lib/game/engine";
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

    // No new cards during quarter intermission — cards are dealt when intermission ends
    if (room.quarterIntermissionEndsAt) {
      const endsAt = new Date(room.quarterIntermissionEndsAt);
      if (endsAt > new Date()) {
        return NextResponse.json(
          {
            error:
              "Drawing cards is paused during the quarter-ending intermission. New cards will be dealt when the intermission ends.",
          },
          { status: 400 }
        );
      }
    }

    if (!room.gameState) {
      return NextResponse.json(
        { error: "Game state not found" },
        { status: 404 }
      );
    }

    // Find the current player (no turn restrictions - anyone can draw)
    const currentPlayer = room.players.find((p) => p.userId === user.id);
    if (!currentPlayer) {
      return NextResponse.json(
        { error: "You are not a player in this room" },
        { status: 403 }
      );
    }

    // Check hand size limit based on room handSize
    const handSizeLimit = room.handSize || 5;
    const cardsInHand = await prisma.cardInstance.count({
      where: {
        roomId: room.id,
        drawnById: currentPlayer.id,
        status: "drawn", // Only count cards that haven't been submitted/resolved
      },
    });

    if (cardsInHand >= handSizeLimit) {
      return NextResponse.json(
        {
          error: `You already have ${cardsInHand} cards in your hand. Maximum hand size is ${handSizeLimit}. Please submit a card before drawing another.`,
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

    // Rebuild deck with same seed + mode so draw order matches game start
    const mode = (room.mode || "party") as GameMode;
    const severities = cards.map(
      (c) => c.severity as "mild" | "moderate" | "severe"
    );
    const deck = generateDeckForMode(
      room.gameState.deckSeed,
      severities,
      mode
    );

    const gameState = {
      roomId: room.id,
      currentTurnPlayerId: room.gameState.currentTurnPlayerId,
      activeCardInstanceId: room.gameState.activeCardInstanceId || null,
      deckSeed: room.gameState.deckSeed,
      deck,
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
          nickname: currentPlayer.nickname,
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
          nickname: currentPlayer.nickname,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
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
