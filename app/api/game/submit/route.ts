import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const submitCardSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
  cardInstanceIds: z.array(z.string()).min(1, "At least one card must be submitted"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode, cardInstanceIds } = submitCardSchema.parse(body);

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

    // Verify user is a player in the room
    const submittingPlayer = room.players.find(
      (p) => p.userId === user.id
    );
    if (!submittingPlayer) {
      return NextResponse.json(
        { error: "You are not a player in this room" },
        { status: 403 }
      );
    }

    // Find all card instances
    const cardInstances = await prisma.cardInstance.findMany({
      where: {
        id: { in: cardInstanceIds },
        roomId: room.id,
      },
      include: {
        card: true,
        drawnBy: {
          include: {
            user: true,
          },
        },
      },
    });

    if (cardInstances.length !== cardInstanceIds.length) {
      return NextResponse.json(
        { error: "One or more card instances not found" },
        { status: 404 }
      );
    }

    // Verify all cards belong to the submitting player and are in "drawn" status
    for (const cardInstance of cardInstances) {
      if (cardInstance.drawnById !== submittingPlayer.id) {
        return NextResponse.json(
          { error: "You can only submit cards you drew" },
          { status: 403 }
        );
      }
      if (cardInstance.status !== "drawn") {
        return NextResponse.json(
          { error: "One or more cards have already been submitted or resolved" },
          { status: 400 }
        );
      }
    }

    // Check if any cards are already part of a submission
    const cardsAlreadySubmitted = await prisma.cardInstance.findMany({
      where: {
        id: { in: cardInstanceIds },
        submission: { isNot: null },
      },
    });

    if (cardsAlreadySubmitted.length > 0) {
      return NextResponse.json(
        { error: "One or more cards have already been submitted" },
        { status: 400 }
      );
    }

    // Check if player has an existing pending submission
    const existingSubmission = await prisma.cardSubmission.findFirst({
      where: {
        roomId: room.id,
        submittedById: submittingPlayer.id,
        status: "pending",
      },
    });

    let submission;
    if (existingSubmission) {
      // Add cards to existing submission
      submission = existingSubmission;
      await prisma.cardInstance.updateMany({
        where: {
          id: { in: cardInstanceIds },
        },
        data: {
          submissionId: existingSubmission.id,
          status: "submitted",
        },
      });
    } else {
      // Create new submission with all cards
      submission = await prisma.cardSubmission.create({
        data: {
          roomId: room.id,
          submittedById: submittingPlayer.id,
          status: "pending",
        },
      });

      // Link all card instances to this submission
      await prisma.cardInstance.updateMany({
        where: {
          id: { in: cardInstanceIds },
        },
        data: {
          submissionId: submission.id,
          status: "submitted",
        },
      });
    }

    // Emit card_submitted event via Ably
    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("card_submitted", {
        roomCode: room.code,
        submissionId: submission.id,
        cardInstanceIds: cardInstanceIds,
        cardCount: cardInstances.length,
        submittedBy: {
          id: submittingPlayer.id,
          name: submittingPlayer.user.name,
          nickname: submittingPlayer.nickname,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        status: submission.status,
        cardCount: cardInstances.length,
        submittedBy: {
          id: submittingPlayer.id,
          name: submittingPlayer.user.name,
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

    console.error("Error submitting card:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
