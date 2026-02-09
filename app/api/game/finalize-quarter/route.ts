import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";
import {
  drawMultipleCards,
  generateDeckForMode,
  type GameMode,
} from "@/lib/game/engine";

const finalizeQuarterSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

// Parse current round (supports "1", "2", ... or legacy "Q1", "Q2", ...)
function parseRoundNumber(value: string | null): number {
  if (!value) return 0;
  const num = parseInt(value, 10);
  if (!Number.isNaN(num)) return num;
  const q = value.toUpperCase().match(/^Q(\d+)$/);
  return q ? parseInt(q[1], 10) : 0;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = finalizeQuarterSchema.parse(body);

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: {
          include: { user: true },
          orderBy: { createdAt: "asc" },
        },
        gameState: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (!room.quarterIntermissionEndsAt) {
      return NextResponse.json(
        { error: "No quarter intermission in progress" },
        { status: 400 }
      );
    }

    const endsAt = new Date(room.quarterIntermissionEndsAt);
    const isHost = room.players.some(
      (p) => p.userId === user.id && p.isHost
    );

    if (endsAt > new Date() && !isHost) {
      return NextResponse.json(
        { error: "Only the host can end the intermission early" },
        { status: 403 }
      );
    }

    const pending = room.pendingQuarterDiscardSelections as Record<
      string,
      string[]
    > | null;
    const playerIdsWithSelection =
      pending && typeof pending === "object"
        ? Object.entries(pending)
            .filter(([, ids]) => Array.isArray(ids) && ids.length > 0)
            .map(([playerId]) => playerId)
        : [];

    if (room.sport && room.gameState && playerIdsWithSelection.length > 0) {
      const cards = await prisma.card.findMany({
        where: { sport: room.sport },
        orderBy: { id: "asc" },
      });

      for (const playerId of playerIdsWithSelection) {
        const cardInstanceIds = pending![playerId] as string[];
        if (!cardInstanceIds?.length) continue;

        const cardInstances = await prisma.cardInstance.findMany({
          where: {
            id: { in: cardInstanceIds },
            roomId: room!.id,
            drawnById: playerId,
            status: "drawn",
          },
          include: { card: true },
        });
        if (cardInstances.length === 0) continue;

        await prisma.cardInstance.updateMany({
          where: { id: { in: cardInstances.map((c) => c.id) } },
          data: { status: "discarded" },
        });

        const pointsToAdd = cardInstances.reduce(
          (sum, ci) => sum + (ci.card?.points ?? 0),
          0
        );
        if (pointsToAdd > 0) {
          const player = await prisma.player.findUnique({
            where: { id: playerId },
          });
          if (player) {
            await prisma.player.update({
              where: { id: playerId },
              data: { points: player.points + pointsToAdd },
            });
          }
        }

        // Only deal enough new cards to fill hand up to handSize (never exceed max)
        const handSize = room.handSize ?? 5;
        const drawnCountAfterDiscard = await prisma.cardInstance.count({
          where: {
            roomId: room!.id,
            drawnById: playerId,
            status: "drawn",
          },
        });
        const cardsToDeal = Math.min(
          cardInstances.length,
          Math.max(0, handSize - drawnCountAfterDiscard)
        );

        const gs = await prisma.gameState.findUnique({
          where: { roomId: room!.id },
        });
        if (!gs || cards.length === 0 || cardsToDeal <= 0) continue;

        const drawnInstances = await prisma.cardInstance.findMany({
          where: { roomId: room!.id },
          include: { card: true },
        });
        const cardIdToIndex = new Map(
          cards.map((card, index) => [card.id, index])
        );
        const drawnCardIndices = drawnInstances
          .map((instance) => cardIdToIndex.get(instance.cardId))
          .filter((index): index is number => index !== undefined);

        const mode = (room!.mode || "party") as GameMode;
        const severities = cards.map(
          (c) => c.severity as "mild" | "moderate" | "severe"
        );
        const deck = generateDeckForMode(gs.deckSeed, severities, mode);

        const engineState = {
          roomId: room!.id,
          currentTurnPlayerId: gs.currentTurnPlayerId,
          activeCardInstanceId: gs.activeCardInstanceId || null,
          deckSeed: gs.deckSeed,
          deck,
          drawnCards: drawnCardIndices,
        };

        const { cardIndices, newState } = drawMultipleCards(
          engineState,
          cardsToDeal
        );
        const newCardInstances = cardIndices.map((cardIndex) => ({
          roomId: room!.id,
          cardId: cards[cardIndex].id,
          drawnById: playerId,
          status: "drawn",
        }));
        if (newCardInstances.length > 0) {
          await prisma.cardInstance.createMany({
            data: newCardInstances,
          });
        }
        await prisma.gameState.update({
          where: { id: gs.id },
          data: { deckSeed: newState.deckSeed },
        });
      }
    }

    const currentRoundNum = parseRoundNumber(room.currentQuarter);
    const nextRoundNum = currentRoundNum + 1;
    const nextRound = String(nextRoundNum);

    const updatedRoom = await prisma.room.update({
      where: { id: room.id },
      data: {
        quarterIntermissionEndsAt: null,
        pendingQuarterDiscardSelections: Prisma.DbNull,
        currentQuarter: nextRound,
      },
    });

    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("quarter_intermission_ended", {
        roomCode: room.code,
        currentQuarter: nextRound,
        timestamp: new Date().toISOString(),
      });
      await channel.publish("quarter_advanced", {
        roomCode: room.code,
        currentQuarter: nextRound,
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

    console.error("Error finalizing quarter:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to finalize quarter", message: errorMessage },
      { status: 500 }
    );
  }
}
