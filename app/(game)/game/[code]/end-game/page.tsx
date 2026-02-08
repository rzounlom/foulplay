import { getCurrentUser } from "@/lib/auth/clerk";
import { prisma } from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import { EndGameScreen } from "@/components/game/end-game-screen";

export default async function EndGamePage({
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

  const room = await prisma.room.findUnique({
    where: { code: roomCode },
    include: {
      players: {
        include: { user: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!room) {
    redirect("/join");
  }

  const userPlayer = room.players.find((p) => p.userId === user.id);
  if (!userPlayer) {
    redirect(`/join?code=${roomCode}`);
  }

  const lastGameEndResult = room.lastGameEndResult as {
    winnerId: string;
    winnerName: string;
    winnerNickname: string | null;
    winnerPoints: number;
    leaderboard: Array<{
      playerId: string;
      name: string;
      nickname: string | null;
      points: number;
    }>;
  } | null;

  // If no end result (e.g. navigated here directly), go back to game room
  if (!lastGameEndResult?.leaderboard?.length) {
    redirect(`/game/${roomCode}`);
  }

  return (
    <EndGameScreen
      roomCode={roomCode}
      lastGameEndResult={lastGameEndResult}
    />
  );
}
