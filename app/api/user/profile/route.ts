import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { z } from "zod";

const updateProfileSchema = z.object({
  defaultNickname: z.string().min(1).max(50).optional(),
  skipTour: z.boolean().optional(),
});

/**
 * GET /api/user/profile
 * Get the current user's profile data
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch user with all profile data
    const profile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        defaultNickname: true,
        gamesPlayed: true,
        gamesWon: true,
        totalPoints: true,
        skipTour: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ profile });
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
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updateProfileSchema.parse(body);

    // Update user profile
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: validatedData,
      select: {
        id: true,
        name: true,
        defaultNickname: true,
        gamesPlayed: true,
        gamesWon: true,
        totalPoints: true,
        skipTour: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ profile: updatedUser });
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
