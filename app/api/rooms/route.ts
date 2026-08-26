import { NextRequest, NextResponse } from "next/server";

import { generateRoomCode } from "@/lib/rooms/utils";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { gameModeSchemaOptional } from "@/lib/game/modes";
import { emitPublicChaosEvent } from "@/lib/analytics/public-chaos-events";
import { assertDrinkingModeAccess } from "@/lib/user/age-gate";
import { trackEventFireAndForget } from "@/lib/analytics/track-event";
import { z } from "zod";

const createRoomSchema = z.object({
  mode: gameModeSchemaOptional,
  sport: z.string().optional(),
  handSize: z.number().int().min(4).max(12).optional(),
  allowQuarterClearing: z.boolean().optional(),
  /** Public (drop-in) chaos: anyone can join live; no paywall yet — reserved for future host monetization. */
  isPublicChaos: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { mode, sport, handSize, allowQuarterClearing, isPublicChaos } =
      createRoomSchema.parse(body);

    const drinkingAccess = await assertDrinkingModeAccess(user.id, mode);
    if (!drinkingAccess.ok) {
      return NextResponse.json({ error: drinkingAccess.error }, { status: 403 });
    }

    if (isPublicChaos) {
      const liveAccess = await assertDrinkingModeAccess(user.id, "party");
      if (!liveAccess.ok) {
        return NextResponse.json({ error: liveAccess.error }, { status: 403 });
      }
    }

    // Generate unique room code
    let code: string;
    let exists = true;
    let attempts = 0;
    while (exists && attempts < 10) {
      code = generateRoomCode();
      const existingRoom = await prisma.room.findUnique({
        where: { code },
      });
      exists = !!existingRoom;
      attempts++;
    }

    if (exists) {
      return NextResponse.json(
        { error: "Failed to generate unique room code" },
        { status: 500 },
      );
    }

    // Create room and host player in a transaction
    const room = await prisma.$transaction(async (tx) => {
      const newRoom = await tx.room.create({
        data: {
          code: code!,
          hostId: user.id,
          status: "lobby",
          mode: mode || null,
          sport: sport || null,
          handSize: handSize || 6,
          allowQuarterClearing: allowQuarterClearing || false,
          canTurnInCards: true,
          showPoints: true,
          allowJoinInProgress: true,
          ...(isPublicChaos
            ? { isPublicChaos: true, allowJoinInProgress: true }
            : {}),
        },
      });

      await tx.player.create({
        data: {
          userId: user.id,
          roomId: newRoom.id,
          isHost: true,
          points: 0,
        },
      });

      return newRoom;
    });

    if (isPublicChaos) {
      emitPublicChaosEvent("public_room_created", {
        roomId: room.id,
        roomCode: room.code,
        playerCount: 1,
        createdVia: "host_create",
        hostUserId: user.id,
      });
    }

    trackEventFireAndForget({
      name: "room_created",
      userId: user.id,
      roomId: room.id,
      props: {
        roomCode: room.code,
        mode: mode ?? null,
        sport: sport ?? null,
        handSize: handSize ?? 6,
        isPublicChaos: !!isPublicChaos,
        createdVia: isPublicChaos ? "host_create" : "private",
      },
    });

    // Fetch room with players
    const roomWithPlayers = await prisma.room.findUnique({
      where: { id: room.id },
      include: {
        players: {
          include: {
            user: true,
          },
        },
      },
    });

    return NextResponse.json(roomWithPlayers, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 },
      );
    }

    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
