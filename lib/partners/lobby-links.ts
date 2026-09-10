export type LobbyPartnerLink = {
  id: string;
  label: string;
  href: string;
};

type SportKey = "football" | "basketball";

function readPartnerUrl(
  sport: SportKey,
  kind: "MERCH" | "FOOD" | "STREAM",
): string | null {
  const key = `NEXT_PUBLIC_PARTNER_${sport.toUpperCase()}_${kind}_URL`;
  const value = process.env[key]?.trim();
  return value || null;
}

/**
 * Sport-aware watch-party partner links (affiliate URLs from env).
 * Only returns links that are configured — keeps lobby clean when unset.
 */
export function getLobbyPartnerLinks(
  sport: string | null | undefined,
): LobbyPartnerLink[] {
  const sportKey: SportKey = sport === "basketball" ? "basketball" : "football";
  const candidates: Array<{ id: string; kind: "MERCH" | "FOOD" | "STREAM"; label: string }> =
    sportKey === "basketball"
      ? [
          { id: "merch", kind: "MERCH", label: "NBA gear" },
          { id: "food", kind: "FOOD", label: "Order snacks" },
          { id: "stream", kind: "STREAM", label: "Stream live" },
        ]
      : [
          { id: "merch", kind: "MERCH", label: "NFL gear" },
          { id: "food", kind: "FOOD", label: "Order snacks" },
          { id: "stream", kind: "STREAM", label: "Stream live" },
        ];

  const out: LobbyPartnerLink[] = [];
  for (const c of candidates) {
    const href = readPartnerUrl(sportKey, c.kind);
    if (href) {
      out.push({ id: c.id, label: c.label, href });
    }
  }
  return out;
}

export function lobbyMonetizationEnabled(isPremium: boolean): boolean {
  if (isPremium) return false;
  return getLobbyPartnerLinks("football").length > 0 ||
    getLobbyPartnerLinks("basketball").length > 0 ||
    isStripeConfiguredForUpgrade();
}

function isStripeConfiguredForUpgrade(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
}
