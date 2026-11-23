/**
 * Launch dealing allowlists. Cards stay in the DB; dealing simply skips
 * commercials/fashion and other non-core titles. Fallback is "exclude hf"
 * so an empty allowlist can never brick a live game.
 */

export const FOOTBALL_LAUNCH_TITLES = new Set([
  "Complete Pass",
  "Incomplete Pass",
  "First Down",
  "Third Down Conversion",
  "Three-and-Out",
  "False Start",
  "Holding (Any Team)",
  "Offside",
  "Delay of Game",
  "Sack",
  "Pass Interference",
  "Personal Foul",
  "Fumble",
  "Interception",
  "Punt",
  "Touchback",
  "Field Goal Made",
  "Missed Field Goal",
  "Extra Point Made",
  "Extra Point Missed",
  "Touchdown",
  "Timeout Called",
  "Replay Review",
  "Two-Minute Warning",
  "Red Zone Trip",
  "4th Down Attempt",
  "4th Down Converted",
  "Big Run (20+ yards)",
  "Big Pass (25+ yards)",
  "Dropped Pass",
  "QB Scramble",
  "Fair Catch",
  "Spike or Kneel Down",
  "Roughing the Passer",
  "Turnover on Downs",
  "Pick-Six",
  "Safety",
  "Kickoff Return TD",
  "Onside Kick",
  "Overtime",
  "Hail Mary Attempt",
  "Successful Hail Mary",
]);

export const BASKETBALL_LAUNCH_TITLES = new Set([
  "Made 3-Pointer",
  "Missed 3-Pointer",
  "Made 2-Pointer",
  "Missed Jumper",
  "Made Layup",
  "Dunk",
  "Missed Dunk",
  "Made Free Throw",
  "Missed Free Throw",
  "Defensive Rebound",
  "Offensive Rebound",
  "Steal",
  "Block",
  "Turnover",
  "Personal Foul",
  "And-One",
  "Technical Foul",
  "Traveling",
  "Shot Clock Violation",
  "Fast Break Score",
  "Charge Taken / Offensive Foul",
  "Timeout",
  "End of Quarter",
  "Halftime",
  "10–0 Run",
  "Alley-Oop Dunk",
  "Poster Dunk",
  "Goaltending",
  "Intentional Foul",
  "Player Fouls Out",
  "Buzzer Beater (End of Quarter)",
  "Game-Winning Shot",
  "Overtime",
  "Flagrant Foul",
  "Player Ejected",
  "Jump Ball",
]);

const MIN_DEALABLE = 12;

export function launchTitlesForSport(sport: string): Set<string> | null {
  if (sport === "football") return FOOTBALL_LAUNCH_TITLES;
  if (sport === "basketball") return BASKETBALL_LAUNCH_TITLES;
  return null;
}

export function filterDealableCards<
  T extends { title: string; tier?: string | null },
>(sport: string, cards: T[]): T[] {
  const allow = launchTitlesForSport(sport);
  if (allow) {
    const allowed = cards.filter((card) => allow.has(card.title));
    if (allowed.length >= MIN_DEALABLE) return allowed;
  }
  const noHf = cards.filter((card) => card.tier !== "hf");
  if (noHf.length >= MIN_DEALABLE) return noHf;
  return cards;
}
