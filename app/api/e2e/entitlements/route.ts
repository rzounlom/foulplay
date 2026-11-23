import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { assertE2eHttpAllowed } from "@/lib/e2e/http-guard";
import {
  e2eEntitlementPatch,
  type E2eEntitlementState,
} from "@/lib/e2e/seed-entitlements";
import { generateRoomCode } from "@/lib/rooms/utils";

const STATES = [
  "FREE",
  "GAME_NIGHT_ACTIVE",
  "GAME_NIGHT_EXPIRED",
  "MONTHLY_ACTIVE",
  "MONTHLY_CANCELED_OR_EXPIRED",
  "LIFETIME",
  "FREE_DAILY_LIMIT_EXHAUSTED",
] as const;

const bodySchema = z.object({
  clerkId: z.string().min(1),
  state: z.enum(STATES),
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

    await prisma.user.update({
      where: { id: user.id },
      data: e2eEntitlementPatch(body.state as E2eEntitlementState),
    });

    if (body.state === "FREE_DAILY_LIMIT_EXHAUSTED") {
      for (let i = 0; i < 2; i++) {
        const code = generateRoomCode();
        await prisma.room.create({
          data: {
            code,
            hostId: user.id,
            status: "ended",
            mode: "non-drinking",
            sport: "football",
            isPublicChaos: false,
            players: {
              create: { userId: user.id, isHost: true, points: 0 },
            },
          },
        });
      }
    }

    return NextResponse.json({ ok: true, userId: user.id, state: body.state });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }
    console.error("[e2e] entitlements:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
