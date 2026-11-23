import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { assertE2eHttpAllowed } from "@/lib/e2e/http-guard";
import { joinRoomCore } from "@/lib/rooms/join-room-core";
import { pickPublicChaosRoom } from "@/lib/rooms/public-chaos-matchmaking";
import { createPublicChaosLobbyRoom } from "@/lib/rooms/create-public-chaos-room";

const bodySchema = z.object({
  clerkId: z.string().min(1),
});

/**
 * Test-only matchmaking entry for Artillery. Never available in production.
 */
export async function POST(request: NextRequest) {
  const denied = assertE2eHttpAllowed(request);
  if (denied) return denied;

  try {
    const body = bodySchema.parse(await request.json());
    const user = await prisma.user.findUnique({
      where: { clerkId: body.clerkId },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const pickedCode = await pickPublicChaosRoom(user.id);
    if (pickedCode) {
      const joined = await joinRoomCore(
        { id: user.id, name: user.name },
        pickedCode,
        undefined,
        { joinSource: "drop_in" },
      );
      if (joined.ok) {
        return NextResponse.json({
          code: joined.room.code,
          status: joined.room.status,
          created: false,
        });
      }
    }

    const newRoom = await createPublicChaosLobbyRoom({ id: user.id });
    return NextResponse.json({
      code: newRoom.code,
      status: "lobby",
      created: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    console.error("[e2e] load drop-in:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
