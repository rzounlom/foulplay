"use client";

interface Player {
  id: string;
  user: {
    id: string;
    name: string;
  };
  isHost: boolean;
  points: number;
  nickname?: string | null;
}

interface PlayerListProps {
  players: Player[];
  currentUserId?: string;
  showPoints?: boolean; // If true, show all players' points. If false, only show current user's points
}

export function PlayerList({ players, currentUserId, showPoints = false }: PlayerListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold mb-4">Players ({players.length})</h3>
      <div className="space-y-2">
        {players.map((player) => {
          const isCurrentUser = player.user.id === currentUserId;
          const shouldShowPoints = showPoints || isCurrentUser;
          const displayName = player.nickname || player.user.name;

          return (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isCurrentUser
                  ? "bg-primary/10 border-primary"
                  : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{displayName}</span>
                {player.isHost && (
                  <span className="text-xs px-2 py-1 bg-accent text-white rounded">
                    Host
                  </span>
                )}
                {isCurrentUser && (
                  <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded">
                    You
                  </span>
                )}
              </div>
              {shouldShowPoints && (
                <span className="text-sm text-neutral-600 dark:text-neutral-400">
                  {player.points} pts
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
