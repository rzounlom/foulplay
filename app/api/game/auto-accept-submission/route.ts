import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { getRoomChannel } from "@/lib/ably/client";
import { processAutoAccept } from "@/lib/game/auto-accept";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

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

    const result = await processAutoAccept(submissionId, roomCode, {
      skipElapsedCheck: false,
    });

    if (result.noop) {
      const submission = await prisma.cardSubmission.findUnique({
        where: { id: submissionId },
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
      return NextResponse.json(
        { error: "Auto-accept only available after 30 seconds" },
        { status: 400 }
      );
    }

    if (result.approvedCount > 0 && result.approvedCardInstances.length > 0) {
      const approvedCards = result.approvedCardInstances;
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
            id: result.submittedBy.id,
            name: result.submittedBy.user.name,
            nickname: result.submittedBy.nickname,
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
      approvedCount: result.approvedCount,
      rejectedCount: result.rejectedCount,
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
