import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { z } from "zod";
import { joinRoomCore } from "@/lib/rooms/join-room-core";

const joinRoomSchema = z.object({
  code: z.string().length(6, "Room code must be 6 characters"),
  nickname: z.string().max(30, "Nickname must be 30 characters or less").optional(),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { code, nickname } = joinRoomSchema.parse(body);

    const result = await joinRoomCore(
      { id: user.id, name: user.name },
      code,
      nickname,
    );

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result.room, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error joining room:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
