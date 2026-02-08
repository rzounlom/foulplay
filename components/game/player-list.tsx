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
          // When showPoints is true, show all players' points (including host)
          // When showPoints is false, only show current user's own points
          const shouldShowPoints = showPoints ? true : isCurrentUser;
          const displayName = player.nickname || player.user.name;

          return (
            <div
              key={player.id}
              className={`flex items-center gap-2 p-3 rounded-lg border ${
                player.isHost
                  ? "bg-accent/10 border-accent"
                  : isCurrentUser
                    ? "bg-primary/10 border-primary"
                    : "bg-surface-muted border-border"
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-medium truncate">{displayName}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {player.isHost && (
                    <span className="text-xs px-2 py-1 bg-accent/20 text-accent rounded whitespace-nowrap">
                      Host
                    </span>
                  )}
                  {isCurrentUser && (
                    <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded whitespace-nowrap">
                      You
                    </span>
                  )}
                </div>
              </div>
              {shouldShowPoints && (
                <span className="text-sm text-neutral-600 dark:text-neutral-400 flex-shrink-0 whitespace-nowrap">
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
