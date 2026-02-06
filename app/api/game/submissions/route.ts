import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const getSubmissionsSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const roomCode = searchParams.get("roomCode");

    if (!roomCode) {
      return NextResponse.json(
        { error: "roomCode is required" },
        { status: 400 }
      );
    }

    const parsed = getSubmissionsSchema.parse({ roomCode });

    // Find room
    const room = await prisma.room.findUnique({
      where: { code: parsed.roomCode.toUpperCase() },
      include: {
        players: {
          where: { userId: user.id },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const player = room.players[0];
    if (!player) {
      return NextResponse.json(
        { error: "You are not a player in this room" },
        { status: 403 }
      );
    }

    // Get pending submissions for this room
    const submissions = await prisma.cardSubmission.findMany({
      where: {
        roomId: room.id,
        status: "pending",
      },
      include: {
        cardInstances: {
          where: {
            // Only include card instances that are still submitted (not resolved or returned to hand)
            status: "submitted",
          },
          include: {
            card: true,
            drawnBy: {
              include: {
                user: true,
              },
            },
            votes: {
              // Get all votes for these card instances
              // (votes are already linked to submissionId, so we'll filter in code if needed)
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
      orderBy: {
        createdAt: "desc",
      },
    });

    // Filter votes to only include votes for the current submission
    // and filter out submissions that have no pending card instances
    const submissionsWithPendingCards = submissions
      .filter((submission) => submission.cardInstances.length > 0)
      .map((submission) => {
        // Filter votes for each card instance to only include votes for this submission
        const cardInstances = submission.cardInstances.map((cardInstance) => {
          const filteredVotes = (cardInstance.votes || []).filter(
            (vote) => vote.submissionId === submission.id
          );
          return {
            ...cardInstance,
            votes: filteredVotes,
          };
        });

        return {
          ...submission,
          cardInstances,
        };
      });

    return NextResponse.json({
      submissions: submissionsWithPendingCards,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error fetching submissions:", error);
    // Log the full error details for debugging
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
