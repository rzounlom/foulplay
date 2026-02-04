import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const submitCardSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
  cardInstanceId: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode, cardInstanceId } = submitCardSchema.parse(body);

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

    // Find the card instance
    const cardInstance = await prisma.cardInstance.findUnique({
      where: { id: cardInstanceId },
      include: {
        card: true,
        drawnBy: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!cardInstance) {
      return NextResponse.json(
        { error: "Card instance not found" },
        { status: 404 }
      );
    }

    // Verify card instance belongs to this room
    if (cardInstance.roomId !== room.id) {
      return NextResponse.json(
        { error: "Card instance does not belong to this room" },
        { status: 400 }
      );
    }

    // Verify card instance is in "drawn" status
    if (cardInstance.status !== "drawn") {
      return NextResponse.json(
        { error: "Card has already been submitted or resolved" },
        { status: 400 }
      );
    }

    // Verify user is the player who drew the card
    const submittingPlayer = room.players.find(
      (p) => p.userId === user.id
    );
    if (!submittingPlayer) {
      return NextResponse.json(
        { error: "You are not a player in this room" },
        { status: 403 }
      );
    }

    if (cardInstance.drawnById !== submittingPlayer.id) {
      return NextResponse.json(
        { error: "You can only submit cards you drew" },
        { status: 403 }
      );
    }

    // Check if submission already exists
    const existingSubmission = await prisma.cardSubmission.findUnique({
      where: { cardInstanceId },
    });

    if (existingSubmission) {
      return NextResponse.json(
        { error: "Card has already been submitted" },
        { status: 400 }
      );
    }

    // Create submission
    const submission = await prisma.cardSubmission.create({
      data: {
        roomId: room.id,
        cardInstanceId: cardInstance.id,
        submittedById: submittingPlayer.id,
        status: "pending",
      },
      include: {
        submittedBy: {
          include: {
            user: true,
          },
        },
        cardInstance: {
          include: {
            card: true,
          },
        },
      },
    });

    // Update card instance status
    await prisma.cardInstance.update({
      where: { id: cardInstance.id },
      data: { status: "submitted" },
    });

    // Emit card_submitted event via Ably
    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("card_submitted", {
        roomCode: room.code,
        submissionId: submission.id,
        cardInstanceId: cardInstance.id,
        card: {
          id: cardInstance.card.id,
          title: cardInstance.card.title,
          description: cardInstance.card.description,
          severity: cardInstance.card.severity,
          type: cardInstance.card.type,
          points: cardInstance.card.points,
        },
        submittedBy: {
          id: submittingPlayer.id,
          name: submittingPlayer.user.name,
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
        card: {
          id: cardInstance.card.id,
          title: cardInstance.card.title,
          description: cardInstance.card.description,
          severity: cardInstance.card.severity,
          type: cardInstance.card.type,
          points: cardInstance.card.points,
        },
        submittedBy: {
          id: submittingPlayer.id,
          name: submittingPlayer.user.name,
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.errors },
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
