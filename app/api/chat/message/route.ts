import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const sendMessageSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
  message: z.string().min(1, "Message cannot be empty").max(500, "Message too long"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode, message: text } = sendMessageSchema.parse(body);

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

    const message = await prisma.message.create({
      data: {
        roomId: room.id,
        senderId: player.id,
        message: text.trim(),
      },
      include: {
        sender: {
          include: { user: true },
        },
      },
    });

    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("message_sent", {
        id: message.id,
        roomId: message.roomId,
        senderId: message.senderId,
        message: message.message,
        createdAt: message.createdAt.toISOString(),
        sender: {
          id: message.sender.id,
          nickname: message.sender.nickname,
          user: {
            id: message.sender.user.id,
            name: message.sender.user.name,
          },
        },
        timestamp: message.createdAt.toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish message_sent:", ablyError);
    }

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        message: message.message,
        createdAt: message.createdAt.toISOString(),
        sender: {
          id: message.sender.id,
          nickname: message.sender.nickname,
          user: { id: message.sender.user.id, name: message.sender.user.name },
        },
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.issues },
        { status: 400 }
      );
    }
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
