/**
 * Shared auto-accept logic for card submissions.
 * Used by both client-triggered auto-accept and QStash durable callback.
 */

import {
  canResolveSubmission,
  getVoteCounts,
} from "@/lib/game/approval";
import { AUTO_ACCEPT_SECONDS } from "@/lib/game/constants";
import { drawRandomCardIndicesSmart } from "@/lib/game/engine";
import { prisma } from "@/lib/db/prisma";

export { AUTO_ACCEPT_SECONDS, AUTO_ACCEPT_DELAY } from "@/lib/game/constants";

export interface ProcessAutoAcceptResult {
  ok: true;
  noop: true;
}
export interface ProcessAutoAcceptResolved {
  ok: true;
  noop: false;
  approvedCount: number;
  rejectedCount: number;
  /** When hand was replenished: player ID and number of cards drawn */
  replenishedPlayerId: string | null;
  replenishedCount: number;
  approvedCardInstances: Array<{
    id: string;
    card: { id: string; title: string; description: string; severity: string; type: string; points: number };
  }>;
  submittedBy: { id: string; user: { name: string }; nickname: string | null };
  room: { id: string; code: string; version: number };
}

export type ProcessAutoAcceptOutcome =
  | ProcessAutoAcceptResult
  | ProcessAutoAcceptResolved;

export interface ProcessAutoAcceptOptions {
  /** When true, skip the elapsed check (e.g. for QStash callback invoked after delay) */
  skipElapsedCheck?: boolean;
}

/**
 * Process auto-accept for a pending submission.
 * Adds votes for non-voters, resolves approved/rejected cards, awards points, replenishes hand.
 * Returns noop if submission not found or already resolved.
 */
export async function processAutoAccept(
  submissionId: string,
  roomCode: string,
  options: ProcessAutoAcceptOptions = {}
): Promise<ProcessAutoAcceptOutcome> {
  const room = await prisma.room.findUnique({
    where: { code: roomCode.toUpperCase() },
    include: {
      players: { include: { user: true } },
      gameState: true,
    },
  });

  if (!room) {
    return { ok: true, noop: true };
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
    return { ok: true, noop: true };
  }

  if (submission.status !== "pending") {
    return { ok: true, noop: true };
  }

  if (!options.skipElapsedCheck) {
    const createdAt = new Date(submission.createdAt);
    const elapsedSeconds = (Date.now() - createdAt.getTime()) / 1000;
    if (elapsedSeconds < AUTO_ACCEPT_SECONDS) {
      return { ok: true, noop: true };
    }
  }

  if (room.quarterIntermissionEndsAt) {
    const endsAt = new Date(room.quarterIntermissionEndsAt);
    if (endsAt > new Date()) {
      return { ok: true, noop: true };
    }
  }

  const totalPlayers = room.players.length;
  const voters = room.players.filter((p) => p.id !== submission.submittedById);
  const eligibleVoters = voters.length;

  for (const cardInstance of submission.cardInstances) {
    const votes = (cardInstance.votes || []).filter(
      (v) => v.submissionId === submissionId
    );
    const voteCounts = getVoteCounts(votes);
    const resolution = canResolveSubmission(
      totalPlayers,
      voteCounts.approvals,
      voteCounts.rejections,
      eligibleVoters
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
    return { ok: true, noop: true };
  }

  const approvedCards: typeof updatedSubmission.cardInstances = [];
  const rejectedCards: typeof updatedSubmission.cardInstances = [];
  const approvedIds = new Set<string>();
  const rejectedIds = new Set<string>();

  for (const cardInstance of updatedSubmission.cardInstances) {
    const voteCounts = getVoteCounts(cardInstance.votes || []);
    const resolution = canResolveSubmission(
      totalPlayers,
      voteCounts.approvals,
      voteCounts.rejections,
      eligibleVoters
    );
    if (resolution === "approved") {
      approvedCards.push(cardInstance);
      approvedIds.add(cardInstance.id);
    } else if (resolution === "rejected") {
      rejectedCards.push(cardInstance);
      rejectedIds.add(cardInstance.id);
    }
  }

  // At timeout: auto-accept only PENDING cards in this batch. Never override rejected cards.
  // Pending = in submission but not resolved by votes (no approval/rejection threshold met).
  // We only reach this code when timer has expired (skipElapsedCheck or elapsed check passed).
  const pendingCards = updatedSubmission.cardInstances.filter(
    (ci) => !approvedIds.has(ci.id) && !rejectedIds.has(ci.id)
  );
  for (const card of pendingCards) {
    approvedCards.push(card);
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

  let replenishedPlayerId: string | null = null;
  let replenishedCount = 0;

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

      replenishedPlayerId = submission.submittedById;
      replenishedCount = drawnIndices.length;
    }
  }

  return {
    ok: true,
    noop: false,
    approvedCount: approvedCards.length,
    rejectedCount: rejectedCards.length,
    replenishedPlayerId,
    replenishedCount,
    approvedCardInstances: approvedCards.map((c) => ({
      id: c.id,
      card: {
        id: c.card.id,
        title: c.card.title,
        description: c.card.description,
        severity: c.card.severity,
        type: c.card.type,
        points: c.card.points,
      },
    })),
    submittedBy: {
      id: updatedSubmission.submittedBy.id,
      user: { name: updatedSubmission.submittedBy.user.name },
      nickname: updatedSubmission.submittedBy.nickname,
    },
    room: { id: room.id, code: room.code, version: room.version },
  };
}
