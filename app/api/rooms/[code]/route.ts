import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { getRoomChannel } from "@/lib/ably/client";

const updateRoomSchema = z.object({
  mode: z.string().optional(),
  sport: z.string().optional(),
  handSize: z.number().int().min(4).max(12).optional(),
  showPoints: z.boolean().optional(),
  allowJoinInProgress: z.boolean().optional(),
  allowQuarterClearing: z.boolean().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;

    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        players: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        gameState: {
          include: {
            currentTurnPlayer: {
              include: {
                user: true,
              },
            },
            activeCardInstance: {
              include: {
                card: true,
                drawnBy: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const body = await request.json();
    const { mode, sport, handSize, showPoints, allowJoinInProgress, allowQuarterClearing } =
      updateRoomSchema.parse(body);

    // Find room and verify user is host
    const room = await prisma.room.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        players: {
          where: { userId: user.id, isHost: true },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.players.length === 0) {
      return NextResponse.json(
        { error: "Only the host can update room settings" },
        { status: 403 }
      );
    }

    // Update room
    const updatedRoom = await prisma.room.update({
      where: { id: room.id },
      data: {
        ...(mode !== undefined && { mode }),
        ...(sport !== undefined && { sport }),
        ...(handSize !== undefined && { handSize }),
        ...(showPoints !== undefined && { showPoints }),
        ...(allowJoinInProgress !== undefined && { allowJoinInProgress }),
        ...(allowQuarterClearing !== undefined && { allowQuarterClearing }),
      },
      include: {
        players: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    // Emit settings updated event
    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("room_settings_updated", {
        roomCode: room.code,
        mode: updatedRoom.mode,
        sport: updatedRoom.sport,
        handSize: updatedRoom.handSize,
        showPoints: updatedRoom.showPoints,
        allowJoinInProgress: updatedRoom.allowJoinInProgress,
        allowQuarterClearing: updatedRoom.allowQuarterClearing,
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json(updatedRoom);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
