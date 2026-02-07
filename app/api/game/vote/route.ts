import { NextRequest, NextResponse } from "next/server";
import {
  canResolveSubmission,
  getVoteCounts,
} from "@/lib/game/approval";

import { drawNextCard } from "@/lib/game/engine";
import { getCurrentUser } from "@/lib/auth/clerk";
import { getRoomChannel } from "@/lib/ably/client";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const voteSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
  submissionId: z.string(),
  cardInstanceIds: z.array(z.string()).min(1, "At least one card must be selected"), // Array of card instance IDs to vote on, or empty for "all"
  vote: z.boolean(), // true = approve, false = reject
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode, submissionId, cardInstanceIds, vote } = voteSchema.parse(body);

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

    // Pause voting during quarter intermission
    if (room.quarterIntermissionEndsAt) {
      const endsAt = new Date(room.quarterIntermissionEndsAt);
      if (endsAt > new Date()) {
        return NextResponse.json(
          {
            error: "Voting is paused during the quarter-ending intermission.",
          },
          { status: 400 }
        );
      }
    }

    // Find submission
    const submission = await prisma.cardSubmission.findUnique({
      where: { id: submissionId },
      include: {
        cardInstances: {
          include: {
            card: true,
            drawnBy: {
              include: {
                user: true,
              },
            },
            votes: {
              include: {
                voter: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        submittedBy: {
          include: {
            user: true,
          },
        },
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

    // Verify player is not voting on their own submission
    if (submission.submittedById === votingPlayer.id) {
      return NextResponse.json(
        { error: "You cannot vote on your own submission" },
        { status: 400 }
      );
    }

    // Determine which cards to vote on
    const cardsToVoteOn = cardInstanceIds.length === 0 
      ? submission.cardInstances // Empty array means "all cards"
      : submission.cardInstances.filter(ci => cardInstanceIds.includes(ci.id));

    if (cardsToVoteOn.length === 0) {
      return NextResponse.json(
        { error: "No valid cards selected to vote on" },
        { status: 400 }
      );
    }

    // Verify all selected cards belong to this submission
    // If a card is in the submission's cardInstances array, it's valid to vote on
    const submissionCardIds = new Set(submission.cardInstances.map(ci => ci.id));
    const invalidCards = cardsToVoteOn.filter(ci => 
      !submissionCardIds.has(ci.id)
    );
    if (invalidCards.length > 0) {
      return NextResponse.json(
        { error: "One or more selected cards do not belong to this submission" },
        { status: 400 }
      );
    }

    // Create or update votes for each selected card
    // Use upsert to handle cases where a card was rejected and resubmitted
    // (same cardInstanceId but different submissionId - we update the vote)
    // This also allows users to change their vote on the same card in the same submission
    const createdVotes = await Promise.all(
      cardsToVoteOn.map(cardInstance =>
        prisma.cardVote.upsert({
          where: {
            cardInstanceId_voterPlayerId: {
              cardInstanceId: cardInstance.id,
              voterPlayerId: votingPlayer.id,
            },
          },
          update: {
            submissionId: submission.id,
            vote: vote,
          },
          create: {
            submissionId: submission.id,
            cardInstanceId: cardInstance.id,
            voterPlayerId: votingPlayer.id,
            vote: vote,
          },
        })
      )
    );

    // Get updated submission with all card instances and their votes
    const updatedSubmission = await prisma.cardSubmission.findUnique({
      where: { id: submissionId },
      include: {
        cardInstances: {
          include: {
            card: true,
            votes: {
              where: {
                submissionId: submissionId, // Only get votes for this submission
              },
              include: {
                voter: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
        submittedBy: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!updatedSubmission) {
      return NextResponse.json(
        { error: "Failed to fetch updated submission" },
        { status: 500 }
      );
    }

    const totalPlayers = room.players.length;
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

    // Check each card instance individually for resolution
    const approvedCards: typeof updatedSubmission.cardInstances = [];
    const rejectedCards: typeof updatedSubmission.cardInstances = [];
    const pendingCards: typeof updatedSubmission.cardInstances = [];

    for (const cardInstance of updatedSubmission.cardInstances) {
      // Votes are already filtered by submissionId in the query above
      const voteCounts = getVoteCounts(cardInstance.votes || []);
      const resolution = canResolveSubmission(
        totalPlayers,
        voteCounts.approvals,
        voteCounts.rejections
      );
      
      console.log(`Card ${cardInstance.id}: ${voteCounts.approvals} approvals, ${voteCounts.rejections} rejections, resolution: ${resolution}, totalPlayers: ${totalPlayers}`);

      if (resolution === "approved") {
        approvedCards.push(cardInstance);
      } else if (resolution === "rejected") {
        rejectedCards.push(cardInstance);
      } else {
        pendingCards.push(cardInstance);
      }
    }

    // Resolve approved cards
    if (approvedCards.length > 0) {
      const approvedCardIds = approvedCards.map(ci => ci.id);
      await prisma.cardInstance.updateMany({
        where: {
          id: { in: approvedCardIds },
        },
        data: { 
          status: "resolved",
          submissionId: null, // Remove link to submission since it's resolved
        },
      });
      console.log(`Resolved ${approvedCards.length} approved cards:`, approvedCardIds);
    }

    // Resolve rejected cards (return to hand)
    if (rejectedCards.length > 0) {
      const rejectedCardIds = rejectedCards.map(ci => ci.id);
      await prisma.cardInstance.updateMany({
        where: {
          id: { in: rejectedCardIds },
        },
        data: {
          status: "drawn",
          submissionId: null, // Remove link to submission
        },
      });
      console.log(`Returned ${rejectedCards.length} rejected cards to hand:`, rejectedCardIds);
    }

    // Check if submission is fully resolved (all cards are approved or rejected)
    const allResolved = pendingCards.length === 0;
    let submissionStatus = submission.status;
    if (allResolved) {
      // If all cards are resolved, mark submission as resolved
      // Use "approved" if at least one card was approved, otherwise "rejected"
      submissionStatus = approvedCards.length > 0 ? "approved" : "rejected";
      await prisma.cardSubmission.update({
        where: { id: submissionId },
        data: { status: submissionStatus },
      });
    }

    // Award points and auto-draw cards for approved cards
    if (approvedCards.length > 0) {
      const submittingPlayer = room.players.find(
        (p) => p.id === submission.submittedById
      );

      if (submittingPlayer) {
        // Calculate total points from approved cards only
        const totalPoints = approvedCards.reduce(
          (sum, cardInstance) => sum + cardInstance.card.points,
          0
        );

        // Award points to the player who submitted
        if (totalPoints > 0) {
          await prisma.player.update({
            where: { id: submission.submittedById },
            data: {
              points: {
                increment: totalPoints,
              },
            },
          });
        }

        // Auto-draw cards to replace approved cards
        // Rejected cards are already returned to hand, so we only need to draw for approved cards
        const handSizeLimit = room.handSize || 5;
        
        // Count cards currently in hand (after rejected cards have been returned)
        const cardsInHand = await prisma.cardInstance.count({
          where: {
            roomId: room.id,
            drawnById: submittingPlayer.id,
            status: "drawn",
          },
        });
        
        // Calculate how many cards were approved (these need replacement)
        const cardsApproved = approvedCards.length;

        // Draw new cards to replace approved cards, up to the hand size limit
        if (room.gameState && room.sport && cardsApproved > 0) {
          // Draw exactly the number of approved cards, but don't exceed hand size limit
          const cardsNeeded = Math.min(handSizeLimit - cardsInHand, cardsApproved);

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

    // Emit events for resolved cards
    try {
      const channel = getRoomChannel(room.code);
      
      // Emit approval events for approved cards
      if (approvedCards.length > 0) {
        const approvedPoints = approvedCards.reduce(
          (sum, cardInstance) => sum + cardInstance.card.points,
          0
        );
        
        await channel.publish("card_approved", {
          roomCode: room.code,
          submissionId: submission.id,
          cardInstanceIds: approvedCards.map((ci) => ci.id),
          cardCount: approvedCards.length,
          cards: approvedCards.map((cardInstance) => ({
            id: cardInstance.card.id,
            title: cardInstance.card.title,
            description: cardInstance.card.description,
            severity: cardInstance.card.severity,
            type: cardInstance.card.type,
            points: cardInstance.card.points,
          })),
          submittedBy: {
            id: updatedSubmission.submittedBy.id,
            name: updatedSubmission.submittedBy.user.name,
            nickname: updatedSubmission.submittedBy.nickname,
          },
          pointsAwarded: approvedPoints,
          timestamp: new Date().toISOString(),
        });
      }

      // Emit rejection events for rejected cards
      if (rejectedCards.length > 0) {
        await channel.publish("card_rejected", {
          roomCode: room.code,
          submissionId: submission.id,
          cardInstanceIds: rejectedCards.map((ci) => ci.id),
          cardCount: rejectedCards.length,
          cards: rejectedCards.map((cardInstance) => ({
            id: cardInstance.card.id,
            title: cardInstance.card.title,
            description: cardInstance.card.description,
            severity: cardInstance.card.severity,
            type: cardInstance.card.type,
            points: cardInstance.card.points,
          })),
          submittedBy: {
            id: updatedSubmission.submittedBy.id,
            name: updatedSubmission.submittedBy.user.name,
            nickname: updatedSubmission.submittedBy.nickname,
          },
          cardsReturned: true, // Indicates cards were returned to hand
          timestamp: new Date().toISOString(),
        });
      }

      // Emit submission fully resolved event if all cards are resolved
      if (allResolved) {
        await channel.publish(
          submissionStatus === "approved" ? "submission_approved" : "submission_rejected",
          {
            roomCode: room.code,
            submissionId: submission.id,
            fullyResolved: true,
            timestamp: new Date().toISOString(),
          }
        );
      }
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    // Emit vote_cast event
    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("vote_cast", {
        roomCode: room.code,
        submissionId: submission.id,
        cardInstanceIds: cardsToVoteOn.map(ci => ci.id),
        voter: {
          id: votingPlayer.id,
          name: votingPlayer.user.name,
          nickname: votingPlayer.nickname,
        },
        vote: vote,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    // Get updated vote counts for each card (votes already filtered by submissionId in query)
    const cardVoteCounts = updatedSubmission.cardInstances.map(ci => {
      const voteCounts = getVoteCounts(ci.votes || []);
      return {
        cardInstanceId: ci.id,
        voteCounts: voteCounts,
        resolution: canResolveSubmission(
          totalPlayers,
          voteCounts.approvals,
          voteCounts.rejections
        ),
      };
    });

    return NextResponse.json({
      success: true,
      votes: createdVotes.map(v => ({
        id: v.id,
        cardInstanceId: v.cardInstanceId,
        vote: v.vote,
      })),
      submission: {
        id: submission.id,
        status: submissionStatus,
        cardVoteCounts: cardVoteCounts,
        approvedCards: approvedCards.map(ci => ci.id),
        rejectedCards: rejectedCards.map(ci => ci.id),
        pendingCards: pendingCards.map(ci => ci.id),
        allResolved: allResolved,
        autoDrawnCards: autoDrawnCards,
      },
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
