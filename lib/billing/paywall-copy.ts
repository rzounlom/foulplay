import { BILLING_CATALOG } from "@/lib/billing/plans";
import type { PaywallTrigger } from "@/lib/billing/hosting-limits";
import { FREE_HOSTED_GAMES_PER_DAY, FREE_MAX_PLAYERS } from "@/lib/billing/hosting-limits";

export type ContextualPaywallCopy = {
  title: string;
  body: string;
  footnote: string;
  showLifetime: boolean;
};

export function getContextualPaywallCopy(
  trigger: PaywallTrigger,
): ContextualPaywallCopy {
  switch (trigger) {
    case "player_limit":
      return {
        title: "Your crew got bigger 👀",
        body: `Free rooms support up to ${FREE_MAX_PLAYERS} players.`,
        footnote: `Unlock tonight for ${BILLING_CATALOG.game_night.displayPrice} — everyone else plays free.`,
        showLifetime: false,
      };
    case "daily_game_limit":
      return {
        title: "Keep the chaos going.",
        body: `You've used today's ${FREE_HOSTED_GAMES_PER_DAY} free hosted games.`,
        footnote: "Unlock unlimited games for the next 24 hours.",
        showLifetime: false,
      };
    case "run_it_back":
      return {
        title: "Keep the chaos going.",
        body: `You've used today's ${FREE_HOSTED_GAMES_PER_DAY} free hosted games.`,
        footnote: "Unlock unlimited games for the next 24 hours.",
        showLifetime: false,
      };
    case "public_hosting":
      return {
        title: "Host a live public game",
        body: "Anyone can jump in while you play.",
        footnote: "Unlock public hosting with FoulPlay+ or a Game Night Pass.",
        showLifetime: false,
      };
    default:
      return {
        title: "Upgrade hosting",
        body: "Only the host upgrades. Everyone else plays free.",
        footnote: "Unlock larger rooms, unlimited games, and public hosting.",
        showLifetime: true,
      };
  }
}
