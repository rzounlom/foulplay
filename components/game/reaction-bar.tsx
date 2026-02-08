"use client";

import { useState } from "react";

const REACTIONS = ["👍", "👎", "🎉", "😂", "❤️", "🔥", "🙌", "😱"] as const;

interface ReactionBarProps {
  roomCode: string;
  onSendReaction: (reactionType: string) => Promise<void>;
}

export function ReactionBar({ roomCode, onSendReaction }: ReactionBarProps) {
  const [sending, setSending] = useState<string | null>(null);

  const handleClick = async (emoji: string) => {
    if (sending) return;
    setSending(emoji);
    try {
      await onSendReaction(emoji);
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      <span className="text-xs text-neutral-500 dark:text-neutral-400 mr-1">React:</span>
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => handleClick(emoji)}
          disabled={!!sending}
          className="text-xl p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-transform hover:scale-110 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-primary/50"
          title={`Send ${emoji}`}
          aria-label={`Send reaction ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
