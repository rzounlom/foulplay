import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { parseRematchReadyUserIds } from "@/lib/rooms/rematch";
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
      include: { players: true },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "ended") {
      return NextResponse.json(
        { error: "Run it back is only available after a game ends" },
        { status: 400 },
      );
    }

    const isMember = room.players.some((p) => p.userId === user.id);
    if (!isMember) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const current = parseRematchReadyUserIds(room.rematchReadyUserIds);
    if (!current.includes(user.id)) {
      current.push(user.id);
    }

    await prisma.room.update({
      where: { id: room.id },
      data: { rematchReadyUserIds: current },
    });

    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("rematch_ready_updated", {
        readyUserIds: current,
        roomCode: room.code,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("rematch_ready_updated publish:", ablyError);
    }

    return NextResponse.json({
      success: true,
      readyUserIds: current,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 },
      );
    }
    console.error("rematch ready:", error);
    return NextResponse.json({ error: "Failed to opt in" }, { status: 500 });
  }
}
