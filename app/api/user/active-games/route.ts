import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";

/**
 * GET /api/user/active-games
 * Get all active games (lobby or active status) that the current user is in
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find all rooms where the user is a player and room status is lobby or active
    const activeGames = await prisma.room.findMany({
      where: {
        players: {
          some: {
            userId: user.id,
          },
        },
        status: {
          in: ["lobby", "active"],
        },
      },
      include: {
        players: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Format response with minimal data
    const games = activeGames.map((room) => ({
      code: room.code,
      status: room.status,
      mode: room.mode,
      sport: room.sport,
      playerCount: room.players.length,
      isHost: room.players.some((p) => p.userId === user.id && p.isHost),
      updatedAt: room.updatedAt,
    }));

    return NextResponse.json({ games });
  } catch (error) {
    console.error("Error fetching active games:", error);
    return NextResponse.json(
      { error: "Failed to fetch active games" },
      { status: 500 }
    );
  }
}
