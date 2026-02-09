import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { getRoomChannel } from "@/lib/ably/client";
import { drawMultipleCards } from "@/lib/game/engine";

const joinRoomSchema = z.object({
  code: z.string().length(6, "Room code must be 6 characters"),
  nickname: z.string().max(30, "Nickname must be 30 characters or less").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, nickname } = joinRoomSchema.parse(body);

    // Find room (include gameState to know if we need to deal cards when joining active game)
    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
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

    if (room.status !== "lobby" && !room.allowJoinInProgress) {
      return NextResponse.json(
        { error: "Room is not accepting new players" },
        { status: 400 }
      );
    }

    // Check if user is already in the room
    const existingPlayer = await prisma.player.findUnique({
      where: {
        userId_roomId: {
          userId: user.id,
          roomId: room.id,
        },
      },
    });

    if (existingPlayer) {
      // User already in room, return room data
      return NextResponse.json(room);
    }

    // Add player to room
    const newPlayer = await prisma.player.create({
      data: {
        userId: user.id,
        roomId: room.id,
        isHost: false,
        points: 0,
        nickname: nickname?.trim() || null,
      },
    });

    // If game is active, deal the new player a hand
    const gameState = room.gameState;
    if (room.status === "active" && gameState && room.sport) {
        const cards = await prisma.card.findMany({
          where: { sport: room.sport },
          orderBy: { id: "asc" },
        });
        if (cards.length > 0) {
          const drawnInstances = await prisma.cardInstance.findMany({
            where: { roomId: room.id },
            include: { card: true },
          });
          const cardIdToIndex = new Map(
            cards.map((card, index) => [card.id, index])
          );
          const drawnCardIndices = drawnInstances
            .map((instance) => cardIdToIndex.get(instance.cardId))
            .filter((index): index is number => index !== undefined);
          const engineState = {
            roomId: room.id,
            currentTurnPlayerId: gameState.currentTurnPlayerId,
            activeCardInstanceId: gameState.activeCardInstanceId || null,
            deckSeed: gameState.deckSeed,
            deck: Array.from({ length: cards.length }, (_, i) => i),
            drawnCards: drawnCardIndices,
          };
          const handSize = room.handSize ?? 5;
          const { cardIndices, newState } = drawMultipleCards(
            engineState,
            handSize
          );
          const cardInstancesToCreate = cardIndices.map((cardIndex) => ({
            roomId: room.id,
            cardId: cards[cardIndex].id,
            drawnById: newPlayer.id,
            status: "drawn",
          }));
          if (cardInstancesToCreate.length > 0) {
            await prisma.cardInstance.createMany({
              data: cardInstancesToCreate,
            });
          }
      await prisma.gameState.update({
        where: { id: gameState.id },
        data: { deckSeed: newState.deckSeed },
      });
    }
    }

    // Fetch updated room with all players (and gameState for active games)
    const updatedRoom = await prisma.room.findUnique({
      where: { id: room.id },
      include: {
        players: {
          include: {
            user: true,
          },
        },
      },
    });

    // Emit player_joined event via Ably
    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("player_joined", {
        playerId: user.id,
        playerName: user.name,
        nickname: nickname?.trim() || null,
        roomCode: room.code,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      // Log but don't fail the request if Ably fails
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json(updatedRoom, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error joining room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
