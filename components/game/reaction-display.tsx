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

export function ReactionDisplay({ reactions, exitingIds }: ReactionDisplayProps) {
  if (reactions.length === 0) return null;

  const shown = reactions.slice(-5);

  return (
    <div className={styles.list}>
      {shown.map((r, i) => {
        const id = r.id ?? `${r.timestamp}-${i}`;
        const exiting = isExiting(id, exitingIds);
        const offsetX = (i - (shown.length - 1) / 2) * 32;
        return (
          <div
            key={id}
            className={styles.wrapper}
            style={{ transform: `translateX(${offsetX}px)` }}
          >
            <div
              className={exiting ? `${styles.pill} ${styles.pillExiting}` : `${styles.pill} ${styles.pillFloat}`}
              style={{ animationDelay: `${i * 80}ms` }}
              aria-live="polite"
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
