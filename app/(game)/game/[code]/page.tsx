import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { Lobby } from "@/components/game/lobby";
import { GameBoard } from "@/components/game/game-board";

export default async function GameRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/");
  }

  const { code } = await params;
  const roomCode = code.toUpperCase();

  // Fetch room data with game state
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
    redirect("/join");
  }

  // Check if user is in the room
  const userPlayer = room.players.find((p) => p.userId === user.id);
  if (!userPlayer) {
    // User not in room, redirect to join
    redirect(`/join?code=${roomCode}`);
  }

  // Render lobby or game board based on room status
  if (room.status === "lobby") {
    return <Lobby roomCode={roomCode} currentUserId={user.id} initialRoom={room} />;
  }

  if (room.status === "active") {
    return <GameBoard roomCode={roomCode} currentUserId={user.id} initialRoom={room} />;
  }

  // Ended game state - could add a game over screen later
  return <Lobby roomCode={roomCode} currentUserId={user.id} initialRoom={room} />;
}
