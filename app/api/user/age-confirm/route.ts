import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { trackEventFireAndForget } from "@/lib/analytics/track-event";

const ageConfirmSchema = z.object({
  is21Plus: z.boolean(),
});

/**
 * POST /api/user/age-confirm
 * Record self-reported 21+ status for CYA tracking.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { is21Plus } = ageConfirmSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        is21Plus,
        ageConfirmedAt: new Date(),
      },
      select: {
        id: true,
        is21Plus: true,
        ageConfirmedAt: true,
      },
    });

    trackEventFireAndForget({
      name: "age_gate_confirmed",
      userId: user.id,
      props: { is21Plus },
    });

    return NextResponse.json({
      profile: {
        ...updatedUser,
        ageConfirmedAt: updatedUser.ageConfirmedAt?.toISOString() ?? null,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 },
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2022"
    ) {
      console.error("Age confirm failed — missing DB columns:", error);
      return NextResponse.json(
        {
          error:
            "Age confirmation is not available yet. Run database migrations and restart the dev server.",
        },
        { status: 503 },
      );
    }

    console.error("Error confirming age:", error);
    return NextResponse.json(
      {
        error: "Failed to save age confirmation",
        ...(process.env.NODE_ENV === "development" && error instanceof Error
          ? { details: error.message }
          : {}),
      },
      { status: 500 },
    );
  }
}
