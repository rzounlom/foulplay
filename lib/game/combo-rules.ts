/**
 * Combo potential rules — sport-agnostic heuristics for UI hints.
 * Uses card tier/severity, duplicate identity, and title clusters (no API).
 */

import { getCardIdentityKey, type CardLike } from "@/lib/game/card-identity";

export type ComboCardFields = CardLike & {
  severity: string;
  tier?: string | null;
  points?: number;
};

/** Event families that often fire close together during live play. */
const TITLE_CLUSTER_KEYWORDS: readonly string[][] = [
  ["pass", "complete", "incomplete", "interception", "qb", "drop", "deflect"],
  ["run", "rush", "scramble", "slide", "carry"],
  ["score", "touchdown", "field goal", "basket", "dunk", "three", "layup", "poster"],
  ["penalty", "flag", "foul", "technical", "roughing", "charge", "offensive", "intentional", "flagrant"],
  ["turnover", "fumble", "steal", "block"],
  ["kick", "punt", "return", "special", "onside"],
  ["challenge", "review", "overturn"],
  ["goaltend", "goaltending", "jump ball"],
];

export function getTitleClusterIndex(title: string): number | null {
  const t = title.trim().toLowerCase();
  if (!t) return null;
  for (let i = 0; i < TITLE_CLUSTER_KEYWORDS.length; i++) {
    if (TITLE_CLUSTER_KEYWORDS[i].some((kw) => t.includes(kw))) return i;
  }
  return null;
}

function countHandCardsInCluster(
  hand: ComboCardFields[],
  cluster: number,
  excludeCard?: ComboCardFields,
): number {
  let n = 0;
  for (const c of hand) {
    if (excludeCard && c === excludeCard) continue;
    if (getTitleClusterIndex(c.title) === cluster) n++;
  }
  return n;
}

/**
 * Per-card combo insight: only when duplicates or another in-hand card shares an event cluster.
 */
export function cardShowsComboInsight(
  card: ComboCardFields,
  ctx: {
    hand: ComboCardFields[];
    identityGroupSize: number;
  },
): boolean {
  if (ctx.identityGroupSize >= 2) return true;

  const cluster = getTitleClusterIndex(card.title);
  if (cluster !== null && countHandCardsInCluster(ctx.hand, cluster, card) > 0) {
    return true;
  }

  return false;
}

export type SelectionComboFeedback = {
  comboLine: string | null;
  bigSwingLine: string | null;
};

const COMBO_LINE = "🔗 Combo potential";
const BIG_SWING_LINE = "Big swing if these hit 😈";

const BIG_SWING_MIN_CARDS = 3;
const BIG_SWING_MIN_POINTS = 7;

function isHighSwingSeverity(severity: string): boolean {
  const s = severity.toLowerCase();
  return s === "severe" || s === "wild";
}

/**
 * Selection-level combo feedback (replaces naive “2+ cards selected” checks).
 */
export function computeSelectionComboFeedback(
  selected: ComboCardFields[],
  hand: ComboCardFields[],
  identityGroups: Map<string, string[]>,
  selectedInstanceIds: string[],
): SelectionComboFeedback {
  const empty: SelectionComboFeedback = { comboLine: null, bigSwingLine: null };
  if (selected.length < 2) return empty;

  const hasCombo = selectionHasComboPotential(
    selected,
    hand,
    identityGroups,
    selectedInstanceIds,
  );
  if (!hasCombo) return empty;

  const totalPoints = selected.reduce((sum, c) => sum + (c.points ?? 0), 0);
  const hasHighSwing =
    selected.length >= BIG_SWING_MIN_CARDS ||
    totalPoints >= BIG_SWING_MIN_POINTS ||
    selected.some((c) => isHighSwingSeverity(c.severity));

  return {
    comboLine: COMBO_LINE,
    bigSwingLine: hasHighSwing ? BIG_SWING_LINE : null,
  };
}

function selectionHasComboPotential(
  selected: ComboCardFields[],
  hand: ComboCardFields[],
  identityGroups: Map<string, string[]>,
  selectedInstanceIds: string[],
): boolean {
  const identityKeys = selected.map((c) => getCardIdentityKey(c));
  if (new Set(identityKeys).size < identityKeys.length) return true;

  for (const card of selected) {
    const key = getCardIdentityKey(card);
    const total = identityGroups.get(key)?.length ?? 0;
    const selectedInGroup = selectedInstanceIds.filter((id) =>
      (identityGroups.get(key) ?? []).includes(id),
    ).length;
    if (total >= 2 && total - selectedInGroup > 0) return true;
  }

  const clusters = selected
    .map((c) => getTitleClusterIndex(c.title))
    .filter((c): c is number => c !== null);
  if (clusters.length >= 2 && new Set(clusters).size < clusters.length) {
    return true;
  }

  if (selected.filter((c) => (c.tier ?? "common").toLowerCase() === "hf").length >= 2) {
    return true;
  }

  return selected.some((card) =>
    cardShowsComboInsight(card, {
      hand,
      identityGroupSize:
        identityGroups.get(getCardIdentityKey(card))?.length ?? 1,
    }),
  );
}
