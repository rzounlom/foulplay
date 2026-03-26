/**
 * Client-side identity for duplicate detection in hand (no API).
 */

export interface CardLike {
  id: string;
  title: string;
  templateId?: string | null;
}

/**
 * Stable key for grouping duplicate definitions. Order-independent.
 */
export function getCardIdentityKey(card: CardLike): string {
  const tpl = card.templateId?.trim();
  if (tpl) return `tpl:${tpl}`;
  const defId = card.id?.trim();
  if (defId) return `def:${defId}`;
  const t = card.title?.trim().toLowerCase() ?? "";
  if (t) return `title:${t}`;
  return "unknown";
}

export function buildIdentityGroups<T extends { id: string; card: CardLike }>(
  instances: T[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const inst of instances) {
    const key = getCardIdentityKey(inst.card);
    const list = map.get(key) ?? [];
    list.push(inst.id);
    map.set(key, list);
  }
  return map;
}

export function countIdentityInHand(
  groups: Map<string, string[]>,
  identityKey: string,
): number {
  return groups.get(identityKey)?.length ?? 0;
}
