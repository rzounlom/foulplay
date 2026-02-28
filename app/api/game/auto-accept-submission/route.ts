import { NextRequest, NextResponse } from "next/server";
import {
  canResolveSubmission,
  getVoteCounts,
} from "@/lib/game/approval";
import { drawRandomCardIndicesSmart } from "@/lib/game/engine";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { getRoomChannel } from "@/lib/ably/client";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const AUTO_ACCEPT_SECONDS = 60;

const schema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
  submissionId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode, submissionId } = schema.parse(body);

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: { include: { user: true } },
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
        { status: 403 }
      );
    }

    if (room.quarterIntermissionEndsAt) {
      const endsAt = new Date(room.quarterIntermissionEndsAt);
      if (endsAt > new Date()) {
        return NextResponse.json(
          { error: "Voting is paused during intermission" },
          { status: 400 }
        );
      }
    }

    const submission = await prisma.cardSubmission.findUnique({
      where: { id: submissionId },
      include: {
        cardInstances: {
          include: {
            card: true,
            votes: true,
          },
        },
        submittedBy: { include: { user: true } },
      },
    });

    if (!submission || submission.roomId !== room.id) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (submission.status !== "pending") {
      return NextResponse.json(
        { error: "Submission already resolved" },
        { status: 400 }
      );
    }

    const createdAt = new Date(submission.createdAt);
    const elapsedSeconds = (Date.now() - createdAt.getTime()) / 1000;
    if (elapsedSeconds < AUTO_ACCEPT_SECONDS) {
      return NextResponse.json(
        { error: "Auto-accept only available after 60 seconds" },
        { status: 400 }
      );
    }

    const totalPlayers = room.players.length;
    const voters = room.players.filter((p) => p.id !== submission.submittedById);

    for (const cardInstance of submission.cardInstances) {
      const votes = (cardInstance.votes || []).filter(
        (v) => v.submissionId === submissionId
      );
      const voteCounts = getVoteCounts(votes);
      const resolution = canResolveSubmission(
        totalPlayers,
        voteCounts.approvals,
        voteCounts.rejections
      );

      if (resolution !== "pending") continue;

      for (const voter of voters) {
        const hasVoted = votes.some((v) => v.voterPlayerId === voter.id);
        if (!hasVoted) {
          await prisma.cardVote.upsert({
            where: {
              cardInstanceId_voterPlayerId: {
                cardInstanceId: cardInstance.id,
                voterPlayerId: voter.id,
              },
            },
            update: { submissionId, vote: true },
            create: {
              submissionId,
              cardInstanceId: cardInstance.id,
              voterPlayerId: voter.id,
              vote: true,
            },
          });
        }
      }
    }

    const updatedSubmission = await prisma.cardSubmission.findUnique({
      where: { id: submissionId },
      include: {
        cardInstances: {
          include: {
            card: true,
            votes: {
              where: { submissionId },
              include: { voter: { include: { user: true } } },
            },
          },
        },
        submittedBy: { include: { user: true } },
      },
    });

    if (!updatedSubmission) {
      return NextResponse.json(
        { error: "Failed to fetch updated submission" },
        { status: 500 }
      );
    }

    const approvedCards: typeof updatedSubmission.cardInstances = [];
    const rejectedCards: typeof updatedSubmission.cardInstances = [];

    for (const cardInstance of updatedSubmission.cardInstances) {
      const voteCounts = getVoteCounts(cardInstance.votes || []);
      const resolution = canResolveSubmission(
        totalPlayers,
        voteCounts.approvals,
        voteCounts.rejections
      );
      if (resolution === "approved") approvedCards.push(cardInstance);
      else if (resolution === "rejected") rejectedCards.push(cardInstance);
    }

    if (approvedCards.length > 0) {
      await prisma.cardInstance.updateMany({
        where: { id: { in: approvedCards.map((c) => c.id) } },
        data: { status: "resolved", submissionId: null },
      });
    }

    if (rejectedCards.length > 0) {
      await prisma.cardInstance.updateMany({
        where: { id: { in: rejectedCards.map((c) => c.id) } },
        data: { status: "drawn", submissionId: null },
      });
    }

    const allResolved =
      approvedCards.length + rejectedCards.length ===
      updatedSubmission.cardInstances.length;

    if (allResolved) {
      await prisma.cardSubmission.update({
        where: { id: submissionId },
        data: {
          status: approvedCards.length > 0 ? "approved" : "rejected",
        },
      });
    }

    if (approvedCards.length > 0) {
      const totalPoints = approvedCards.reduce(
        (sum, ci) => sum + ci.card.points,
        0
      );
      if (totalPoints > 0) {
        await prisma.player.update({
          where: { id: submission.submittedById },
          data: { points: { increment: totalPoints } },
        });
      }

      const submittingPlayer = room.players.find(
        (p) => p.id === submission.submittedById
      );
      const handSizeLimit = room.handSize || 6;
      const cardsInHand = await prisma.cardInstance.count({
        where: {
          roomId: room.id,
          drawnById: submission.submittedById,
          status: "drawn",
        },
      });
      const cardsNeeded = Math.min(
        handSizeLimit - cardsInHand,
        approvedCards.length
      );

      if (
        submittingPlayer &&
        room.gameState &&
        room.sport &&
        cardsNeeded > 0
      ) {
        const cards = await prisma.card.findMany({
          where: { sport: room.sport },
          orderBy: { id: "asc" },
        });

        const handWithCards = await prisma.cardInstance.findMany({
          where: {
            roomId: room.id,
            drawnById: submission.submittedById,
            status: "drawn",
          },
          include: { card: true },
        });
        const currentHandIndices = handWithCards
          .map((ci) => cards.findIndex((c) => c.id === ci.cardId))
          .filter((i) => i >= 0);

        const drawnIndices = drawRandomCardIndicesSmart(
          cards,
          cardsNeeded,
          room.mode ?? null,
          handSizeLimit,
          currentHandIndices
        );

        for (const cardIndex of drawnIndices) {
          const selectedCard = cards[cardIndex];
          await prisma.cardInstance.create({
            data: {
              roomId: room.id,
              cardId: selectedCard.id,
              drawnById: submission.submittedById,
              status: "drawn",
            },
          });
        }
      }

      try {
        const channel = getRoomChannel(room.code);
        await channel.publish("card_approved", {
          roomCode: room.code,
          submissionId,
          cardInstanceIds: approvedCards.map((c) => c.id),
          cardCount: approvedCards.length,
          cards: approvedCards.map((ci) => ({
            id: ci.card.id,
            title: ci.card.title,
            description: ci.card.description,
            severity: ci.card.severity,
            type: ci.card.type,
            points: ci.card.points,
          })),
          submittedBy: {
            id: updatedSubmission.submittedBy.id,
            name: updatedSubmission.submittedBy.user.name,
            nickname: updatedSubmission.submittedBy.nickname,
          },
          pointsAwarded: approvedCards.reduce(
            (sum, ci) => sum + ci.card.points,
            0
          ),
          autoAccepted: true,
          timestamp: new Date().toISOString(),
        });
      } catch (ablyError) {
        console.error("Failed to publish card_approved:", ablyError);
      }
    }

    return NextResponse.json({
      success: true,
      approvedCount: approvedCards.length,
      rejectedCount: rejectedCards.length,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Auto-accept submission error:", error);
    return NextResponse.json(
      {
        error: "Failed to auto-accept",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
