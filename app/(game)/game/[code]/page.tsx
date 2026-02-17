import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { Lobby } from "@/components/game/lobby";
import { GameBoard, type Room } from "@/components/game/game-board";

export default async function GameRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ tour?: string }>;
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
    const roomForClient = JSON.parse(JSON.stringify(room)) as Room;
    const { tour } = await searchParams;
    return (
      <GameBoard
        roomCode={roomCode}
        currentUserId={user.id}
        initialRoom={roomForClient}
        showTourOnMount={tour === "1"}
      />
    );
  }

  // Ended game — redirect to end-game page (or lobby if no result)
  if (room.status === "ended") {
    const hasEndResult = room.lastGameEndResult && typeof room.lastGameEndResult === "object";
    if (hasEndResult) {
      redirect(`/game/${roomCode}/end-game`);
    }
  }

  return <Lobby roomCode={roomCode} currentUserId={user.id} initialRoom={room} />;
}
