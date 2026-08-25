import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { emitPublicChaosEvent } from "@/lib/analytics/public-chaos-events";

const abandonedSchema = z.object({
  event: z.literal("public_room_abandoned"),
  roomCode: z
    .string()
    .length(6)
    .transform((s) => s.toUpperCase()),
  durationMs: z.number().int().min(0),
  playerCount: z.number().int().min(0).optional(),
  repeatVisit: z.boolean().optional(),
  sessionVisitOrdinal: z.number().int().min(1).optional(),
});

/**
 * Client-ingested public chaos events (e.g. tab close / Home). Server-emitted events use emitPublicChaosEvent directly.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = abandonedSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { event: _e, ...rest } = parsed.data;
    emitPublicChaosEvent("public_room_abandoned", {
      ...rest,
      userId: user.id,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("public-chaos analytics POST:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
