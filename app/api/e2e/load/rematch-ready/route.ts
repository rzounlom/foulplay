import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { assertE2eHttpAllowed } from "@/lib/e2e/http-guard";
import { parseRematchReadyUserIds } from "@/lib/rooms/rematch";

const bodySchema = z.object({
  clerkId: z.string().min(1),
  roomCode: z.string().length(6),
});

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

    const room = await prisma.room.findUnique({
      where: { code: body.roomCode.toUpperCase() },
    });
    if (!room || room.status !== "ended") {
      return NextResponse.json({ error: "Ended room not found" }, { status: 404 });
    }

    const ready = parseRematchReadyUserIds(room.rematchReadyUserIds);
    if (!ready.includes(user.id)) ready.push(user.id);
    await prisma.room.update({
      where: { id: room.id },
      data: { rematchReadyUserIds: ready },
    });
    return NextResponse.json({ ok: true, readyCount: ready.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    console.error("[e2e] rematch-ready:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
