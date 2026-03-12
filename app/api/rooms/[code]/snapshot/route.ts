import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserFromRequest } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { AUTO_ACCEPT_DELAY_SECONDS } from "@/lib/game/constants";

/**
 * GET /api/rooms/[code]/snapshot
 * Authoritative room snapshot for client bootstrap.
 * Returns version, players, scores, turn, pending submissions (with autoAcceptAt), and viewer's hand.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const user = await getCurrentUserFromRequest(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await params;
    const roomCode = code.toUpperCase();

    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: {
        players: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        gameState: {
          include: {
            currentTurnPlayer: {
              include: {
                user: true,
              },
            },
            activeCardInstance: {
              include: {
                card: true,
                drawnBy: {
                  include: {
                    user: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!room) {
      return NextResponse.json({ error: "Room not found" }, { status: 404 });
    }

    // Pending submissions (visible to all players)
    const pendingSubmissions = await prisma.cardSubmission.findMany({
      where: {
        roomId: room.id,
        status: "pending",
      },
      include: {
        cardInstances: {
          where: { status: "submitted" },
          include: {
            card: true,
            drawnBy: { include: { user: true } },
            votes: {
              include: {
                voter: { include: { user: true } },
              },
            },
          },
        },
        submittedBy: { include: { user: true } },
        votes: {
          include: {
            voter: { include: { user: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const submissionsWithCards = pendingSubmissions
      .filter((s) => s.cardInstances.length > 0)
      .map((s) => {
        const createdAt = new Date(s.createdAt).getTime();
        const autoAcceptAt = new Date(
          createdAt + AUTO_ACCEPT_DELAY_SECONDS * 1000
        ).toISOString();
        return { ...s, autoAcceptAt };
      });

    // Viewer's hand (only if they are a player)
    const currentPlayer = room.players.find((p) => p.userId === user.id);
    let hand: Array<{ id: string; card: unknown; status: string }> = [];
    if (currentPlayer) {
      const cardsInHand = await prisma.cardInstance.findMany({
        where: {
          roomId: room.id,
          drawnById: currentPlayer.id,
          status: "drawn",
        },
        include: { card: true },
        orderBy: { createdAt: "asc" },
      });
      hand = cardsInHand.map((ci) => ({
        id: ci.id,
        card: ci.card,
        status: ci.status,
      }));
    }

    const snapshot = {
      roomId: room.id,
      roomCode: room.code,
      version: room.version,
      status: room.status,
      mode: room.mode,
      sport: room.sport,
      handSize: room.handSize,
      showPoints: room.showPoints,
      allowJoinInProgress: room.allowJoinInProgress,
      allowQuarterClearing: room.allowQuarterClearing,
      canTurnInCards: room.canTurnInCards,
      currentQuarter: room.currentQuarter,
      quarterIntermissionEndsAt: room.quarterIntermissionEndsAt,
      pendingQuarterDiscardSelections: room.pendingQuarterDiscardSelections,
      quarterDiscardDonePlayerIds: room.quarterDiscardDonePlayerIds,
      suggestEndRoundPlayerIds: room.suggestEndRoundPlayerIds,
      players: room.players.map((p) => ({
        id: p.id,
        userId: p.userId,
        points: p.points,
        isHost: p.isHost,
        nickname: p.nickname,
        user: p.user,
      })),
      currentTurnPlayerId: room.gameState?.currentTurnPlayerId ?? null,
      activeCardInstance: room.gameState?.activeCardInstance ?? null,
      submissions: submissionsWithCards,
      hand,
    };

    return NextResponse.json(snapshot);
  } catch (error) {
    console.error("Snapshot error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
