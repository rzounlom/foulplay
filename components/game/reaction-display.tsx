"use client";

export interface ReactionEvent {
  id?: string;
  reactionType: string;
  sender: {
    id: string;
    nickname?: string | null;
    user: { id: string; name: string };
  };
  timestamp: string;
}

interface ReactionDisplayProps {
  reactions: ReactionEvent[];
}

export function ReactionDisplay({ reactions }: ReactionDisplayProps) {
  if (reactions.length === 0) return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex flex-col items-center gap-1">
      {reactions.slice(-5).map((r, i) => (
        <div
          key={r.id ?? `${r.timestamp}-${i}`}
          className="animate-bounce flex items-center gap-2 px-4 py-2 rounded-full bg-black/70 text-white text-lg shadow-lg"
        >
          <span>{r.reactionType}</span>
          <span className="text-sm opacity-90">
            {r.sender.nickname || r.sender.user.name}
          </span>
        </div>
      ))}
    </div>
  );
}
