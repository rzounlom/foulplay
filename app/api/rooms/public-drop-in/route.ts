import { NextRequest, NextResponse } from "next/server";

import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { joinRoomCore } from "@/lib/rooms/join-room-core";
import { pickPublicChaosRoom } from "@/lib/rooms/public-chaos-matchmaking";
import { createPublicChaosLobbyRoom } from "@/lib/rooms/create-public-chaos-room";

/**
 * POST — matchmake into a live public chaos room or spawn a new lobby.
 */
export async function POST(_request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(_request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const room = await prisma.room.findUnique({
      where: { id: newRoom.id },
      select: { code: true, status: true },
    });

    return NextResponse.json({
      code: room?.code ?? newRoom.code,
      status: room?.status ?? "lobby",
      created: true,
    });
  } catch (error) {
    console.error("public-drop-in error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
