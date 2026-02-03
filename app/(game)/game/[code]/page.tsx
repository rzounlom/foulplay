import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { Lobby } from "@/components/game/lobby";

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

  // Fetch room data
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

  return <Lobby roomCode={roomCode} currentUserId={user.id} initialRoom={room} />;
}
