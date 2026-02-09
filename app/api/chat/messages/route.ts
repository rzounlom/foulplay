import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const querySchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const { roomCode } = querySchema.parse({
      roomCode: searchParams.get("roomCode") ?? undefined,
    });

    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    const currentPlayer = await prisma.player.findFirst({
      where: { roomId: room.id, userId: user.id },
    });
    if (!currentPlayer) {
      return NextResponse.json(
        { error: "You are not a player in this room" },
        { status: 403 }
      );
    }

    const messages = await prisma.message.findMany({
      where: { roomId: room.id },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          include: { user: { select: { id: true, name: true } } },
        },
      },
    });

    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        message: m.message,
        createdAt: m.createdAt.toISOString(),
        sender: {
          id: m.sender.id,
          nickname: m.sender.nickname,
          user: { id: m.sender.user.id, name: m.sender.user.name },
        },
      })),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
