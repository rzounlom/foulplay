"use client";

interface Player {
  id: string;
  user: {
    id: string;
    name: string;
  };
  isHost: boolean;
  points: number;
}

interface PlayerListProps {
  players: Player[];
  currentUserId?: string;
}

export function PlayerList({ players, currentUserId }: PlayerListProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold mb-4">Players ({players.length})</h3>
      <div className="space-y-2">
        {players.map((player) => (
          <div
            key={player.id}
            className={`flex items-center justify-between p-3 rounded-lg border ${
              player.user.id === currentUserId
                ? "bg-primary/10 border-primary"
                : "bg-neutral-50 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium">{player.user.name}</span>
              {player.isHost && (
                <span className="text-xs px-2 py-1 bg-accent text-white rounded">
                  Host
                </span>
              )}
              {player.user.id === currentUserId && (
                <span className="text-xs px-2 py-1 bg-primary/20 text-primary rounded">
                  You
                </span>
              )}
            </div>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">
              {player.points} pts
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
