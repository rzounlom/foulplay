import { REFRESH_HAND_COOLDOWN_MS } from "@/lib/game/launch-scope";

export type RefreshHandBlockReason =
  | "inactive"
  | "pending"
  | "intermission"
  | "cooldown"
  | "empty";

export function getRefreshHandEligibleAt(input: {
  playerJoinedAt: Date;
  lastSubmissionAt: Date | null;
  newestDrawnAt: Date | null;
}): Date {
  const times = [input.playerJoinedAt.getTime()];
  if (input.lastSubmissionAt) {
    times.push(input.lastSubmissionAt.getTime());
  }
  if (input.newestDrawnAt) {
    times.push(input.newestDrawnAt.getTime());
  }
  return new Date(Math.max(...times) + REFRESH_HAND_COOLDOWN_MS);
}

export function evaluateRefreshHand(input: {
  now: Date;
  roomStatus: string;
  hasPendingSubmission: boolean;
  intermissionActive: boolean;
  drawnCount: number;
  playerJoinedAt: Date;
  lastSubmissionAt: Date | null;
  newestDrawnAt: Date | null;
}):
  | { ok: true; availableAt: Date }
  | { ok: false; reason: RefreshHandBlockReason; availableAt: Date } {
  const availableAt = getRefreshHandEligibleAt(input);

  if (input.roomStatus !== "active") {
    return { ok: false, reason: "inactive", availableAt };
  }
  if (input.hasPendingSubmission) {
    return { ok: false, reason: "pending", availableAt };
  }
  if (input.intermissionActive) {
    return { ok: false, reason: "intermission", availableAt };
  }
  if (input.drawnCount < 1) {
    return { ok: false, reason: "empty", availableAt };
  }
  if (input.now.getTime() < availableAt.getTime()) {
    return { ok: false, reason: "cooldown", availableAt };
  }
  return { ok: true, availableAt };
}

export function refreshHandErrorMessage(reason: RefreshHandBlockReason): string {
  switch (reason) {
    case "pending":
      return "Wait until your current cards are voted on before refreshing your hand.";
    case "intermission":
      return "Hand refresh is paused during intermission.";
    case "cooldown":
      return "Refresh Hand is available every 5 minutes when you have not just played a card.";
    case "empty":
      return "You have no cards in hand to refresh.";
    default:
      return "Game is not active.";
  }
}
