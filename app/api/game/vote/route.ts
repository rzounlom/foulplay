import { NextRequest, NextResponse } from "next/server";
import {
  canResolveSubmission,
  getVoteCounts,
  requiredApprovals,
} from "@/lib/game/approval";

import { drawNextCard } from "@/lib/game/engine";
import { getCurrentUser } from "@/lib/auth/clerk";
import { getRoomChannel } from "@/lib/ably/client";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const voteSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
  submissionId: z.string(),
  vote: z.boolean(), // true = approve, false = reject
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode, submissionId, vote } = voteSchema.parse(body);

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

    // Find submission
    const submission = await prisma.cardSubmission.findUnique({
      where: { id: submissionId },
      include: {
        cardInstance: {
          include: {
            card: true,
            drawnBy: {
              include: {
                user: true,
              },
            },
          },
        },
        submittedBy: {
          include: {
            user: true,
          },
        },
        votes: true,
      },
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    // Verify submission belongs to this room
    if (submission.roomId !== room.id) {
      return NextResponse.json(
        { error: "Submission does not belong to this room" },
        { status: 400 }
      );
    }

    // Verify submission is still pending
    if (submission.status !== "pending") {
      return NextResponse.json(
        { error: "Submission has already been resolved" },
        { status: 400 }
      );
    }

    // Verify user is a player in the room
    const votingPlayer = room.players.find((p) => p.userId === user.id);
    if (!votingPlayer) {
      return NextResponse.json(
        { error: "You are not a player in this room" },
        { status: 403 }
      );
    }

    // Verify player hasn't already voted
    const existingVote = submission.votes.find(
      (v) => v.voterPlayerId === votingPlayer.id
    );
    if (existingVote) {
      return NextResponse.json(
        { error: "You have already voted on this submission" },
        { status: 400 }
      );
    }

    // Verify player is not voting on their own submission
    if (submission.submittedById === votingPlayer.id) {
      return NextResponse.json(
        { error: "You cannot vote on your own submission" },
        { status: 400 }
      );
    }

    // Create vote
    const newVote = await prisma.cardVote.create({
      data: {
        submissionId: submission.id,
        voterPlayerId: votingPlayer.id,
        vote: vote,
      },
    });

    // Get updated vote counts
    const updatedSubmission = await prisma.cardSubmission.findUnique({
      where: { id: submissionId },
      include: {
        votes: true,
      },
    });

    if (!updatedSubmission) {
      return NextResponse.json(
        { error: "Failed to fetch updated submission" },
        { status: 500 }
      );
    }

    const voteCounts = getVoteCounts(updatedSubmission.votes);
    const totalPlayers = room.players.length;
    const resolution = canResolveSubmission(
      totalPlayers,
      voteCounts.approvals,
      voteCounts.rejections
    );

    let submissionStatus = submission.status;
    const autoDrawnCards: Array<{
      id: string;
      card: {
        id: string;
        title: string;
        description: string;
        severity: string;
        type: string;
        points: number;
      };
    }> = [];

    // If submission can be resolved, update it
    if (resolution !== "pending") {
      submissionStatus = resolution;

      // Update submission status
      await prisma.cardSubmission.update({
        where: { id: submissionId },
        data: { status: resolution },
      });

      // Update card instance status
      await prisma.cardInstance.update({
        where: { id: submission.cardInstanceId },
        data: { status: "resolved" },
      });

      // If approved, award points and auto-draw cards if needed
      if (resolution === "approved") {
        const submittingPlayer = room.players.find(
          (p) => p.id === submission.submittedById
        );

        if (submittingPlayer) {
          // Award points to the player who submitted
          await prisma.player.update({
            where: { id: submission.submittedById },
            data: {
              points: {
                increment: submission.cardInstance.card.points,
              },
            },
          });

          // Auto-draw cards if player has less than 5 cards in hand
          const HAND_SIZE_LIMIT = 5;
          const cardsInHand = await prisma.cardInstance.count({
            where: {
              roomId: room.id,
              drawnById: submittingPlayer.id,
              status: "drawn",
            },
          });

          if (cardsInHand < HAND_SIZE_LIMIT && room.gameState && room.sport) {
            const cardsNeeded = HAND_SIZE_LIMIT - cardsInHand;

            // Get all cards for the sport
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
              const cardIdToIndex = new Map(
                cards.map((card, index) => [card.id, index])
              );
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

              // Draw cards needed to fill hand
              for (let i = 0; i < cardsNeeded; i++) {
                const { cardIndex, newState } = drawNextCard(gameState);
                if (cardIndex !== null) {
                  const selectedCard = cards[cardIndex];

                  // Create card instance
                  const cardInstance = await prisma.cardInstance.create({
                    data: {
                      roomId: room.id,
                      cardId: selectedCard.id,
                      drawnById: submittingPlayer.id,
                      status: "drawn",
                    },
                    include: {
                      card: true,
                    },
                  });

                  autoDrawnCards.push({
                    id: cardInstance.id,
                    card: {
                      id: selectedCard.id,
                      title: selectedCard.title,
                      description: selectedCard.description,
                      severity: selectedCard.severity,
                      type: selectedCard.type,
                      points: selectedCard.points,
                    },
                  });

                  // Update game state for next draw
                  Object.assign(gameState, newState);

                  // Emit card_drawn event
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
                        id: submittingPlayer.id,
                        name: submittingPlayer.user.name,
                        nickname: submittingPlayer.nickname,
                      },
                      autoDrawn: true,
                      timestamp: new Date().toISOString(),
                    });
                  } catch (ablyError) {
                    console.error("Failed to publish Ably event:", ablyError);
                  }
                } else {
                  break; // Deck exhausted
                }
              }
            }
          }
        }
      }

      // Emit submission resolution event
      try {
        const channel = getRoomChannel(room.code);
        await channel.publish(
          resolution === "approved" ? "submission_approved" : "submission_rejected",
          {
            roomCode: room.code,
            submissionId: submission.id,
            cardInstanceId: submission.cardInstanceId,
            card: {
              id: submission.cardInstance.card.id,
              title: submission.cardInstance.card.title,
              description: submission.cardInstance.card.description,
              severity: submission.cardInstance.card.severity,
              type: submission.cardInstance.card.type,
              points: submission.cardInstance.card.points,
            },
            submittedBy: {
              id: submission.submittedBy.id,
              name: submission.submittedBy.user.name,
              nickname: submission.submittedBy.nickname,
            },
            pointsAwarded:
              resolution === "approved"
                ? submission.cardInstance.card.points
                : 0,
            timestamp: new Date().toISOString(),
          }
        );
      } catch (ablyError) {
        console.error("Failed to publish Ably event:", ablyError);
      }
    }

    // Emit vote_cast event
    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("vote_cast", {
        roomCode: room.code,
        submissionId: submission.id,
        vote: vote,
        voter: {
          id: votingPlayer.id,
          name: votingPlayer.user.name,
        },
        voteCounts: {
          approvals: voteCounts.approvals,
          rejections: voteCounts.rejections,
          total: voteCounts.total,
          required: requiredApprovals(totalPlayers),
        },
        resolved: resolution !== "pending",
        resolution: resolution,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      vote: {
        id: newVote.id,
        vote: newVote.vote,
        voter: {
          id: votingPlayer.id,
          name: votingPlayer.user.name,
        },
      },
      voteCounts: {
        approvals: voteCounts.approvals,
        rejections: voteCounts.rejections,
        total: voteCounts.total,
        required: requiredApprovals(totalPlayers),
      },
      submission: {
        id: submission.id,
        status: submissionStatus,
        resolved: resolution !== "pending",
        resolution: resolution,
      },
      autoDrawnCards: autoDrawnCards,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error casting vote:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
