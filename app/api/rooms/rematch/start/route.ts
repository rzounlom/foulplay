import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import {
  buildRematchParticipantUserIds,
  parseRematchReadyUserIds,
} from "@/lib/rooms/rematch";
import { createRematchLobbyFromEndedRoom } from "@/lib/rooms/create-rematch-lobby";
import { z } from "zod";

const bodySchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = bodySchema.parse(body);
    const codeUpper = roomCode.toUpperCase();

    const room = await prisma.room.findUnique({
      where: { code: codeUpper },
      include: {
        players: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "ended") {
      return NextResponse.json(
        { error: "This room is not in an ended state" },
        { status: 400 },
      );
    }

    if (room.hostId !== user.id) {
      return NextResponse.json(
        { error: "Only the host can start the next game" },
        { status: 403 },
      );
    }

    const memberSet = new Set(room.players.map((p) => p.userId));
    const ready = parseRematchReadyUserIds(room.rematchReadyUserIds);
    const participantUserIds = buildRematchParticipantUserIds(
      room.hostId,
      ready,
      memberSet,
    );

    const participantSet = new Set(participantUserIds);
    const orderedUserIds = room.players
      .map((p) => p.userId)
      .filter((id) => participantSet.has(id));

    let created: { code: string; memberUserIds: string[] };
    try {
      created = await createRematchLobbyFromEndedRoom({
        sourceRoomId: room.id,
        participantUserIdsOrdered: orderedUserIds,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      if (msg === "MISSING_SETTINGS") {
        return NextResponse.json(
          {
            error:
              "This room is missing mode or sport. Create a new room from scratch.",
          },
          { status: 400 },
        );
      }
      if (msg === "NO_PARTICIPANTS") {
        return NextResponse.json(
          { error: "No players to carry over. Have someone tap Run it back first." },
          { status: 400 },
        );
      }
      throw e;
    }

    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("rematch_started", {
        newRoomCode: created.code,
        memberUserIds: created.memberUserIds,
        previousRoomCode: room.code,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("rematch_started publish:", ablyError);
    }

    return NextResponse.json({
      success: true,
      code: created.code,
      memberUserIds: created.memberUserIds,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 },
      );
    }
    console.error("rematch start:", error);
    return NextResponse.json(
      { error: "Failed to start next game" },
      { status: 500 },
    );
  }
}
