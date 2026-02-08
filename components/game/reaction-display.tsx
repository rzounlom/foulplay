"use client";

import styles from "./reaction-display.module.css";

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
  exitingIds?: Set<string> | string[];
}

function isExiting(id: string | undefined, exitingIds?: Set<string> | string[]): boolean {
  if (!id || !exitingIds) return false;
  if (Array.isArray(exitingIds)) return exitingIds.includes(id);
  return exitingIds.has(id);
}

const MAX_VISIBLE = 6;

export function ReactionDisplay({ reactions, exitingIds }: ReactionDisplayProps) {
  if (reactions.length === 0) return null;

  const shown = reactions.slice(-MAX_VISIBLE);

  return (
    <div className={styles.list} role="status" aria-live="polite" aria-label="Reactions from players">
      {shown.map((r, i) => {
        const id = r.id ?? `${r.timestamp}-${i}`;
        const exiting = isExiting(id, exitingIds);
        const offsetX = (i - (shown.length - 1) / 2) * 36;
        return (
          <div
            key={id}
            className={styles.wrapper}
            style={{ transform: `translateX(${offsetX}px)` }}
          >
            <div
              className={`${styles.pill} ${exiting ? styles.pillExiting : styles.pillFloat} bg-neutral-800/95 dark:bg-neutral-900/95 text-white border border-neutral-700/50 dark:border-neutral-600/50`}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <span
                className={styles.emoji}
                style={{ animationDelay: `${i * 80 + 150}ms` }}
                aria-hidden
              >
                {r.reactionType}
              </span>
              <span className={styles.name}>
                {r.sender.nickname || r.sender.user.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
