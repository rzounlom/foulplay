"use client";

import { useState } from "react";

const REACTIONS: { emoji: string; label: string }[] = [
  { emoji: "👍", label: "Thumbs up" },
  { emoji: "👎", label: "Thumbs down" },
  { emoji: "🎉", label: "Celebrate" },
  { emoji: "😂", label: "Laugh" },
  { emoji: "❤️", label: "Love" },
  { emoji: "🔥", label: "Fire" },
  { emoji: "🙌", label: "Hands up" },
  { emoji: "😱", label: "Shocked" },
];

interface ReactionBarProps {
  roomCode: string;
  onSendReaction: (reactionType: string) => Promise<void>;
}

export function ReactionBar({ onSendReaction }: ReactionBarProps) {
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
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border shadow-sm">
      <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 shrink-0">
        React
      </span>
      <div className="flex items-center gap-0.5">
        {REACTIONS.map(({ emoji, label }) => {
          const isSending = sending === emoji;
          return (
            <button
              key={emoji}
              type="button"
              onClick={() => handleClick(emoji)}
              disabled={!!sending}
              className="relative text-xl p-2 rounded-lg hover:bg-surface-muted transition-all duration-200 hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              title={`Send ${label}`}
              aria-label={`Send reaction ${label}`}
              aria-busy={isSending}
            >
              <span className={isSending ? "inline-block animate-pulse opacity-80" : ""}>
                {emoji}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
