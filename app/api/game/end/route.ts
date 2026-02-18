import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { getRoomChannel } from "@/lib/ably/client";
import { z } from "zod";

const endGameSchema = z.object({
  roomCode: z.string().length(6, "Room code must be 6 characters"),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { roomCode } = endGameSchema.parse(body);

    // Find room and verify user is host
    const room = await prisma.room.findUnique({
      where: { code: roomCode.toUpperCase() },
      include: {
        players: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        gameState: true,
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    if (room.status !== "active") {
      return NextResponse.json(
        { error: "Game is not active" },
        { status: 400 }
      );
    }

    // Verify user is host
    const hostPlayer = room.players.find((p) => p.userId === user.id && p.isHost);
    if (!hostPlayer) {
      return NextResponse.json(
        { error: "Only the host can end the game" },
        { status: 403 }
      );
    }

    // Determine winner (player with highest points)
    const winner = room.players.reduce((prev, current) =>
      (current.points > prev.points) ? current : prev
    );

    // Build leaderboard (descending by points) for end-game page
    const leaderboard = [...room.players]
      .sort((a, b) => b.points - a.points)
      .map((p) => ({
        playerId: p.id,
        name: p.user.name,
        nickname: p.nickname,
        points: p.points,
      }));

    const lastGameEndResult = {
      winnerId: winner.id,
      winnerName: winner.user.name,
      winnerNickname: winner.nickname,
      winnerPoints: winner.points,
      leaderboard,
    };

    // Store result and set room status to ended (end-game page will display results)
    await prisma.room.update({
      where: { id: room.id },
      data: {
        lastGameEndResult: lastGameEndResult as object,
        status: "ended",
      },
    });

    // Update user stats for all players
    await Promise.all(
      room.players.map(async (player) => {
        const userRecord = await prisma.user.findUnique({
          where: { id: player.userId },
        });

        if (userRecord) {
          await prisma.user.update({
            where: { id: player.userId },
            data: {
              gamesPlayed: { increment: 1 },
              gamesWon: player.id === winner.id ? { increment: 1 } : undefined,
              totalPoints: { increment: player.points },
            },
          });
        }
      })
    );

    // Delete old game state and card instances
    if (room.gameState) {
      await prisma.gameState.delete({
        where: { id: room.gameState.id },
      });
    }

    // Delete all card instances for this room
    await prisma.cardInstance.deleteMany({
      where: { roomId: room.id },
    });

    // Delete all submissions for this room
    await prisma.cardSubmission.deleteMany({
      where: { roomId: room.id },
    });

    // Reset all player points to 0 (room is ended; points stored in lastGameEndResult)
    await prisma.player.updateMany({
      where: { roomId: room.id },
      data: { points: 0 },
    });

    // Emit game_ended so all players redirect to end-game page
    try {
      const channel = getRoomChannel(room.code);
      await channel.publish("game_ended", {
        roomCode: room.code,
        winner: {
          id: winner.id,
          name: winner.user.name,
          nickname: winner.nickname,
          points: winner.points,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (ablyError) {
      console.error("Failed to publish Ably event:", ablyError);
    }

    return NextResponse.json({
      success: true,
      winner: {
        id: winner.id,
        name: winner.user.name,
        nickname: winner.nickname,
        points: winner.points,
      },
      message: "Game ended",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request body", details: error.issues },
        { status: 400 }
      );
    }

    console.error("Error ending game:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { error: "Failed to end game", message: errorMessage, stack: errorStack },
      { status: 500 }
    );
  }
}
