import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { assertE2eHttpAllowed } from "@/lib/e2e/http-guard";
import { generateRoomCode } from "@/lib/rooms/utils";

const bodySchema = z.object({
  hostClerkId: z.string().min(1),
  playerClerkIds: z.array(z.string()).optional(),
  kind: z.enum(["private_lobby", "public_lobby"]),
  allowQuarterClearing: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  const denied = assertE2eHttpAllowed(request);
  if (denied) return denied;

  try {
    const body = bodySchema.parse(await request.json());
    const host = await prisma.user.findUnique({
      where: { clerkId: body.hostClerkId },
    });
    if (!host) {
      return NextResponse.json({ error: "Host not found" }, { status: 404 });
    }

    const playerUsers = body.playerClerkIds?.length
      ? await prisma.user.findMany({
          where: { clerkId: { in: body.playerClerkIds } },
        })
      : [];

    let code = generateRoomCode();
    for (let i = 0; i < 8; i++) {
      const clash = await prisma.room.findUnique({ where: { code } });
      if (!clash) break;
      code = generateRoomCode();
    }

    const isPublic = body.kind === "public_lobby";
    const memberIds = [host.id, ...playerUsers.map((u) => u.id)];
    const room = await prisma.room.create({
      data: {
        code,
        hostId: host.id,
        status: "lobby",
        mode: isPublic ? "party" : "non-drinking",
        sport: "football",
        allowJoinInProgress: true,
        isPublicChaos: isPublic,
        allowQuarterClearing: body.allowQuarterClearing ?? false,
        players: {
          create: memberIds.map((userId) => ({
            userId,
            isHost: userId === host.id,
            points: 0,
          })),
        },
      },
    });

    return NextResponse.json({
      ok: true,
      code: room.code,
      roomId: room.id,
      allowJoinInProgress: room.allowJoinInProgress,
      isPublicChaos: room.isPublicChaos,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    console.error("[e2e] rooms:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
