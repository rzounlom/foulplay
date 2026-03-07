import { verifySignatureAppRouter } from "@upstash/qstash/nextjs";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { processAutoAccept } from "@/lib/game/auto-accept";
import { publishRoomEvent } from "@/lib/realtime/publish-room-event";
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

    // Increment room version and publish submission.accepted (including zero-vote auto-accept)
    const updatedRoom = await prisma.room.update({
      where: { id: result.room.id },
      data: { version: { increment: 1 } },
      select: { version: true },
    });

    await publishRoomEvent({
      type: "submission.accepted",
      roomId: result.room.id,
      roomCode: result.room.code,
      version: updatedRoom.version,
      submissionId,
      acceptedBy: "auto",
    });

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
