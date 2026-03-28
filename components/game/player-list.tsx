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
  /** From rematch flow — users who opted into Run it back */
  rematchCrewUserIds?: Set<string>;
  /** Previous game winner (User.id) for small badge */
  rematchChampionUserId?: string | null;
}

export function PlayerList({
  players,
  currentUserId,
  showPoints = false,
  rematchCrewUserIds,
  rematchChampionUserId = null,
}: PlayerListProps) {
  return (
    <div className="space-y-2">
      <h3
        className={`text-lg font-semibold ${players.length === 1 ? "mb-2" : "mb-4"}`}
      >
        Players ({players.length})
      </h3>
      {players.length === 1 && (
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
          Waiting for players…
        </p>
      )}
      <div className="space-y-2">
        {players.map((player) => {
          const isCurrentUser = player.user.id === currentUserId;
          // When showPoints is true, show all players' points (including host)
          // When showPoints is false, only show current user's own points
          const shouldShowPoints = showPoints ? true : isCurrentUser;
          const displayName = player.nickname || player.user.name;
          const isRematchCrew =
            rematchCrewUserIds?.has(player.user.id) ?? false;
          const isPrevChampion =
            !!rematchChampionUserId &&
            player.user.id === rematchChampionUserId;

          return (
            <div
              key={player.id}
              className={`flex items-center gap-2 p-3 rounded-lg border ${
                player.isHost
                  ? "bg-accent/10 border-accent"
                  : isCurrentUser
                    ? "bg-primary/10 border-primary"
                    : isRematchCrew
                      ? "bg-primary/5 border-primary/30"
                      : "bg-surface-muted border-border"
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="font-medium truncate">{displayName}</span>
                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
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
                  {isRematchCrew && (
                    <span className="text-[10px] sm:text-xs px-1.5 py-0.5 bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/25 rounded whitespace-nowrap">
                      Run it back
                    </span>
                  )}
                  {isPrevChampion && (
                    <span className="text-[10px] sm:text-xs px-1.5 py-0.5 bg-amber-500/15 text-amber-800 dark:text-amber-200 border border-amber-500/25 rounded whitespace-nowrap">
                      👑 Last win
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
