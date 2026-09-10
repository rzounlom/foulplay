import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";
import { withProfileBilling } from "@/lib/billing/profile-billing";

const updateProfileSchema = z.object({
  defaultNickname: z
    .union([z.string().max(50), z.null()])
    .optional()
    .transform((v) => (v === "" ? null : v)),
  skipTour: z.boolean().optional(),
});

const profileSelect = {
  id: true,
  name: true,
  defaultNickname: true,
  gamesPlayed: true,
  gamesWon: true,
  totalPoints: true,
  skipTour: true,
  is21Plus: true,
  ageConfirmedAt: true,
  subscriptionStatus: true,
  subscriptionCurrentPeriodEnd: true,
  gameNightPassExpiresAt: true,
  lifetimeAccess: true,
  stripeCustomerId: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toProfileJson(
  profile: {
    id: string;
    name: string;
    defaultNickname: string | null;
    gamesPlayed: number;
    gamesWon: number;
    totalPoints: number;
    skipTour: boolean;
    is21Plus: boolean | null;
    ageConfirmedAt: Date | null;
    subscriptionStatus: string;
    subscriptionCurrentPeriodEnd: Date | null;
    gameNightPassExpiresAt: Date | null;
    lifetimeAccess: boolean;
    stripeCustomerId: string | null;
    createdAt: Date;
    updatedAt: Date;
  },
) {
  const { stripeCustomerId, createdAt, updatedAt, ...rest } = profile;
  const billing = withProfileBilling({ ...rest, stripeCustomerId });
  return {
    ...rest,
    ageConfirmedAt: profile.ageConfirmedAt?.toISOString() ?? null,
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
    ...billing,
  };
}

/**
 * GET /api/user/profile
 * Get the current user's profile data
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: profileSelect,
    });

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      profile: toProfileJson(profile),
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/user/profile
 * Update the current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: validatedData,
      select: profileSelect,
    });

    return NextResponse.json({
      profile: toProfileJson(updatedUser),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error updating user profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
