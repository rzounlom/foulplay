import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { getRoomChannel } from "@/lib/ably/client";
import { prisma } from "@/lib/db/prisma";
import { publishRoomEvent } from "@/lib/realtime/publish-room-event";
import { drawRandomCardIndicesSmart } from "@/lib/game/engine";
import { findDealableCards } from "@/lib/game/dealable-cards";
import { consumeRateLimit } from "@/lib/http/rate-limit";
import {
  LAUNCH_REFRESH_HAND_ENABLED,
  REFRESH_HAND_COOLDOWN_MS,
} from "@/lib/game/launch-scope";
import {
  evaluateRefreshHand,
  refreshHandErrorMessage,
} from "@/lib/game/refresh-hand";

const bodySchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

function isIntermissionActive(endsAt: Date | string | null | undefined): boolean {
  if (!endsAt) return false;
  return new Date(endsAt).getTime() > Date.now();
}

/**
 * POST /api/game/refresh-hand
 * Replaces the caller's drawn (unsubmitted) cards after a 5-minute quiet period.
 * Never touches submitted/pending cards or other players' hands.
 */
export async function POST(request: NextRequest) {
  try {
    if (!LAUNCH_REFRESH_HAND_ENABLED) {
      return NextResponse.json(
        { error: "Refresh Hand is not enabled" },
        { status: 404 },
      );
    }

    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const limited = consumeRateLimit(`refresh-hand:${user.id}`, 8, 60_000);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Too many refresh requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(limited.retryAfterMs / 1000)),
          },
        },
      );
    }

    const { roomCode } = bodySchema.parse(await request.json());
    const code = roomCode.toUpperCase();

    const room = await prisma.room.findUnique({
      where: { code },
      include: {
        players: true,
        gameState: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const player = room.players.find((p) => p.userId === user.id);
    if (!player) {
      return NextResponse.json(
        { error: "You are not a player in this room" },
        { status: 403 },
      );
    }

    if (!room.sport || !room.gameState) {
      return NextResponse.json(
        { error: "Game is not active" },
        { status: 400 },
      );
    }

    const cards = await findDealableCards(room.sport);
    if (cards.length === 0) {
      return NextResponse.json(
        { error: "No cards found for this sport" },
        { status: 500 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`
        SELECT id FROM "Player" WHERE id = ${player.id} FOR UPDATE
      `;

      const pending = await tx.cardSubmission.findFirst({
        where: {
          roomId: room.id,
          submittedById: player.id,
          status: "pending",
        },
        select: { id: true },
      });

      const lastSubmission = await tx.cardSubmission.findFirst({
        where: {
          roomId: room.id,
          submittedById: player.id,
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      });

      const drawnCards = await tx.cardInstance.findMany({
        where: {
          roomId: room.id,
          drawnById: player.id,
          status: "drawn",
        },
        select: { id: true, createdAt: true, submissionId: true },
      });

      const refreshable = drawnCards.filter((card) => card.submissionId == null);
      const newestDrawnAt =
        refreshable.length > 0
          ? refreshable.reduce(
              (latest, card) =>
                card.createdAt > latest ? card.createdAt : latest,
              refreshable[0].createdAt,
            )
          : null;

      const decision = evaluateRefreshHand({
        now: new Date(),
        roomStatus: room.status,
        hasPendingSubmission: !!pending,
        intermissionActive: isIntermissionActive(room.quarterIntermissionEndsAt),
        drawnCount: refreshable.length,
        playerJoinedAt: player.createdAt,
        lastSubmissionAt: lastSubmission?.createdAt ?? null,
        newestDrawnAt,
      });

      if (!decision.ok) {
        return {
          ok: false as const,
          reason: decision.reason,
          availableAt: decision.availableAt,
        };
      }

      const retired = await tx.cardInstance.updateMany({
        where: {
          id: { in: refreshable.map((card) => card.id) },
          roomId: room.id,
          drawnById: player.id,
          status: "drawn",
          submissionId: null,
        },
        data: { status: "discarded" },
      });

      if (retired.count === 0) {
        return {
          ok: false as const,
          reason: "empty" as const,
          availableAt: decision.availableAt,
        };
      }

      const stillDrawn = await tx.cardInstance.count({
        where: {
          roomId: room.id,
          drawnById: player.id,
          status: "drawn",
        },
      });

      const handSize = room.handSize || 6;
      const cardsNeeded = Math.max(0, handSize - stillDrawn);
      if (cardsNeeded === 0) {
        return {
          ok: true as const,
          cardCount: 0,
          version: undefined,
          availableAt: new Date(),
        };
      }

      const remainingHand = await tx.cardInstance.findMany({
        where: {
          roomId: room.id,
          drawnById: player.id,
          status: "drawn",
        },
        include: { card: true },
      });
      const currentHandIndices = remainingHand
        .map((instance) => cards.findIndex((card) => card.id === instance.cardId))
        .filter((index) => index >= 0);

      const drawnIndices = drawRandomCardIndicesSmart(
        cards,
        cardsNeeded,
        room.mode ?? null,
        handSize,
        currentHandIndices,
      );

      if (drawnIndices.length > 0) {
        await tx.cardInstance.createMany({
          data: drawnIndices.map((cardIndex) => ({
            roomId: room.id,
            cardId: cards[cardIndex].id,
            drawnById: player.id,
            status: "drawn",
          })),
        });
      }

      const updatedRoom = await tx.room.update({
        where: { id: room.id },
        data: { version: { increment: 1 } },
        select: { version: true },
      });

      return {
        ok: true as const,
        cardCount: drawnIndices.length,
        version: updatedRoom.version,
        availableAt: new Date(Date.now() + REFRESH_HAND_COOLDOWN_MS),
      };
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          error: refreshHandErrorMessage(result.reason),
          reason: result.reason,
          availableAt: result.availableAt.toISOString(),
        },
        { status: 400 },
      );
    }

    if (result.cardCount > 0 && result.version != null) {
      try {
        await publishRoomEvent({
          type: "hand.replenished",
          roomId: room.id,
          roomCode: room.code,
          version: result.version,
          playerId: player.id,
          cardCount: result.cardCount,
        });
      } catch (publishError) {
        console.error("Failed to publish hand.replenished:", publishError);
      }

      try {
        const channel = getRoomChannel(room.code);
        await channel.publish("hand_refreshed", {
          roomCode: room.code,
          playerId: player.id,
          cardCount: result.cardCount,
          timestamp: new Date().toISOString(),
        });
      } catch (ablyError) {
        console.error("Failed to publish Ably hand_refreshed:", ablyError);
      }
    }

    return NextResponse.json({
      success: true,
      cardCount: result.cardCount,
      availableAt: result.availableAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 },
      );
    }
    console.error("Error refreshing hand:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

