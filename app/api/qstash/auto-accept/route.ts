import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processAutoAccept } from "@/lib/game/auto-accept";
import { publishRoomEvent } from "@/lib/realtime/publish-room-event";
import { getRoomChannel } from "@/lib/ably/client";
import { prisma } from "@/lib/db/prisma";

const bodySchema = z.object({
  submissionId: z.string(),
});

/** Exported for testing; used by POST with signature verification */
export async function autoAcceptHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const { submissionId } = bodySchema.parse(body);

    const submission = await prisma.cardSubmission.findUnique({
      where: { id: submissionId },
      include: { room: true },
    });

    if (!submission) {
      return NextResponse.json({ ok: true, noop: true }, { status: 200 });
    }

    if (submission.status !== "pending") {
      return NextResponse.json({ ok: true, noop: true }, { status: 200 });
    }

    const roomCode = submission.room.code;
    const result = await processAutoAccept(submissionId, roomCode, {
      skipElapsedCheck: true,
    });

    if (result.noop) {
      return NextResponse.json({ ok: true, noop: true }, { status: 200 });
    }

    // Increment room version and publish appropriate event
    const updatedRoom = await prisma.room.update({
      where: { id: result.room.id },
      data: { version: { increment: 1 } },
      select: { version: true },
    });

    if (result.approvedCount > 0) {
      await publishRoomEvent({
        type: "submission.accepted",
        roomId: result.room.id,
        roomCode: result.room.code,
        version: updatedRoom.version,
        submissionId,
        acceptedBy: "auto",
      });
    } else if (result.rejectedCount > 0) {
      await publishRoomEvent({
        type: "submission.rejected",
        roomId: result.room.id,
        roomCode: result.room.code,
        version: updatedRoom.version,
        submissionId,
      });
    }

    if (
      result.replenishedCount > 0 &&
      result.replenishedPlayerId
    ) {
      await publishRoomEvent({
        type: "hand.replenished",
        roomId: result.room.id,
        roomCode: result.room.code,
        version: updatedRoom.version,
        playerId: result.replenishedPlayerId,
        cardCount: result.replenishedCount,
      });
    }

    // Publish legacy channel events for UI popups (points, confetti, drink penalty)
    try {
      const channel = getRoomChannel(result.room.code);
      if (result.approvedCount > 0 && (result.approvedCardInstances?.length ?? 0) > 0) {
        await channel.publish("card_approved", {
          roomCode: result.room.code,
          submissionId,
          cardInstanceIds: result.approvedCardInstances.map((c) => c.id),
          cardCount: result.approvedCount,
          cards: result.approvedCardInstances.map((ci) => ({
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
          pointsAwarded: result.approvedCardInstances.reduce(
            (sum, ci) => sum + ci.card.points,
            0
          ),
          autoAccepted: true,
          timestamp: new Date().toISOString(),
        });
      }
      if (result.rejectedCount > 0 && (result.rejectedCardInstances?.length ?? 0) > 0) {
        await channel.publish("card_rejected", {
          roomCode: result.room.code,
          submissionId,
          cardInstanceIds: result.rejectedCardInstances.map((c) => c.id),
          cardCount: result.rejectedCount,
          cards: result.rejectedCardInstances.map((ci) => ({
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
          cardsReturned: true,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (ablyError) {
      console.error("Failed to publish legacy card_approved/card_rejected:", ablyError);
    }

    return NextResponse.json({
      ok: true,
      noop: false,
      approvedCount: result.approvedCount,
      rejectedCount: result.rejectedCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.issues },
        { status: 400 }
      );
    }
    console.error("QStash auto-accept error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export const POST = verifySignatureAppRouter(autoAcceptHandler);
