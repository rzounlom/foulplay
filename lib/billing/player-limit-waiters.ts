export type PlayerLimitWaiter = {
  userId: string;
  name: string;
  requestedAt: string;
};

export function parsePlayerLimitWaiters(value: unknown): PlayerLimitWaiter[] {
  if (!Array.isArray(value)) return [];
  const out: PlayerLimitWaiter[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    if (typeof rec.userId !== "string" || typeof rec.name !== "string") continue;
    out.push({
      userId: rec.userId,
      name: rec.name,
      requestedAt:
        typeof rec.requestedAt === "string"
          ? rec.requestedAt
          : new Date().toISOString(),
    });
  }
  return out;
}

export function upsertPlayerLimitWaiter(
  existing: unknown,
  waiter: PlayerLimitWaiter,
): PlayerLimitWaiter[] {
  const current = parsePlayerLimitWaiters(existing);
  const without = current.filter((w) => w.userId !== waiter.userId);
  without.push(waiter);
  return without.slice(-20);
}
