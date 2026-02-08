import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const ALLOWED_REACTIONS = ["👍", "👎", "🎉", "😂", "❤️", "🔥", "🙌", "😱"] as const;

const reactionSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
  reactionType: z.enum(ALLOWED_REACTIONS),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode, reactionType } = reactionSchema.parse(body);

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: {
          include: { user: true },
        },
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

    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("reaction_sent", {
        reactionType,
        sender: {
          id: player.id,
          nickname: player.nickname,
          user: { id: player.user.id, name: player.user.name },
        },
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish reaction_sent:", ablyError);
      return NextResponse.json(
        { error: "Failed to send reaction" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error sending reaction:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
