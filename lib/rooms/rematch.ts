/**
 * Ended-room rematch: opt-in roster stored on Room.rematchReadyUserIds (User.id strings).
 */

export function parseRematchReadyUserIds(raw: unknown): string[] {
  if (!raw || !Array.isArray(raw)) return [];
  const ids = raw.filter(
    (x): x is string => typeof x === "string" && x.length > 0,
  );
  return [...new Set(ids)];
}

export function buildRematchParticipantUserIds(
  hostId: string,
  readyUserIds: string[],
  validMemberUserIds: Set<string>,
): string[] {
  const out = new Set<string>();
  if (validMemberUserIds.has(hostId)) out.add(hostId);
  for (const id of readyUserIds) {
    if (validMemberUserIds.has(id)) out.add(id);
  }
  return [...out];
}
