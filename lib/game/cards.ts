/**
 * Card definitions for FoulPlay game
 * Cards are organized by sport and include severity levels.
 * All penalties are for the card holder only.
 */

export type Sport = "football" | "basketball";
export type Severity = "mild" | "moderate" | "severe";
export type CardType = "action" | "challenge" | "penalty";

export interface CardDefinition {
  sport: Sport;
  title: string;
  description: string;
  severity: Severity;
  type: CardType;
  points: number; // Points awarded for this card
}

/**
 * Penalty text constants.
 * Keep these centralized so we can:
 * - quickly tune difficulty across the whole deck
 * - support non-drinking modes later (swap these strings)
 * - avoid inconsistent wording / typos
 */
export const PENALTIES = {
  DRINK: "Take a drink",
  TWO_DRINKS: "Take 2 drinks",
  THREE_DRINKS: "Take 3 drinks",
  SHOT: "Take a shot",
  SHOTGUN: "Shotgun a beer",
  FINISH: "Finish your drink",
  FINISH_HALF: "Finish your drink + 1/2 another",
} as const;

// -------------------
// FOOTBALL (Revamped ~55)
// -------------------
export const FOOTBALL_CARDS: CardDefinition[] = [
  // Mild (Common Gameplay Events)
  { sport: "football", title: "Incomplete Pass", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Complete Pass", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Run Play", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "First Down", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Third Down Conversion", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 2 },
  { sport: "football", title: "Three-and-Out", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  { sport: "football", title: "QB Scramble", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "QB Slides", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "QB Throws It Away", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  { sport: "football", title: "Punt", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Touchback", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Fair Catch", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  // Mild (Common Penalties - broad, recognizable)
  { sport: "football", title: "False Start", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Offside", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Holding (Any Team)", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Delay of Game", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Pass Interference", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 3 },
  { sport: "football", title: "Personal Foul", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 4 },

  // Moderate (Pressure / Momentum)
  { sport: "football", title: "Sack", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 3 },
  { sport: "football", title: "Big Run (20+ yards)", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 3 },
  { sport: "football", title: "Big Pass (25+ yards)", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 3 },
  { sport: "football", title: "Red Zone Trip", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 3 },
  { sport: "football", title: "Goal Line Stand", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 4 },

  { sport: "football", title: "Field Goal Made", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 3 },
  { sport: "football", title: "Missed Field Goal", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 2 },
  { sport: "football", title: "Extra Point Missed", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 2 },
  { sport: "football", title: "Two-Point Attempt", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 4 },

  // Turnovers (Big moments)
  { sport: "football", title: "Fumble", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 4 },
  { sport: "football", title: "Turnover (Any)", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 5 },
  { sport: "football", title: "Interception", description: PENALTIES.SHOT, severity: "moderate", type: "penalty", points: 5 },

  // Game Flow / Broadcast Staples
  { sport: "football", title: "Timeout Called", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Coach Challenge", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Replay Review", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Two-Minute Warning", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 2 },
  { sport: "football", title: "Injury Timeout", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  // Severe (Rare / Game-Changing) — card-holder only
  { sport: "football", title: "Touchdown", description: PENALTIES.FINISH, severity: "severe", type: "penalty", points: 7 },
  { sport: "football", title: "Pick-Six", description: PENALTIES.SHOTGUN, severity: "severe", type: "penalty", points: 8 },
  { sport: "football", title: "Kickoff Return TD", description: PENALTIES.SHOTGUN, severity: "severe", type: "penalty", points: 8 },
  { sport: "football", title: "Fumble Return TD", description: PENALTIES.SHOTGUN, severity: "severe", type: "penalty", points: 8 },
  { sport: "football", title: "Safety", description: PENALTIES.FINISH_HALF, severity: "severe", type: "penalty", points: 8 },
  { sport: "football", title: "Overtime", description: PENALTIES.FINISH, severity: "severe", type: "penalty", points: 7 },
  { sport: "football", title: "Game-Winning Touchdown", description: PENALTIES.FINISH_HALF, severity: "severe", type: "penalty", points: 9 },
  { sport: "football", title: "Game-Winning Field Goal", description: PENALTIES.FINISH_HALF, severity: "severe", type: "penalty", points: 9 },

  // Fun Broadcast Moments
  { sport: "football", title: "Announcer Says 'Rookie'", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Announcer Says 'Veteran Presence'", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Announcer Mentions 'Momentum'", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Coach Seen Yelling on Sideline", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Crowd Goes Wild on a Replay", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  // Commercial Cards
  { sport: "football", title: "Beer Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Car Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Fast Food Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Sports Betting Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Insurance Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  { sport: "football", title: "Animal in a Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Celebrity in a Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "football", title: "Same Commercial Plays Twice", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 3 },

  // Optional Rarities
  { sport: "football", title: "Hail Mary Attempt", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 4 },
  { sport: "football", title: "Successful Hail Mary", description: PENALTIES.SHOTGUN, severity: "severe", type: "penalty", points: 9 },
];

// -------------------
// BASKETBALL (Revamped ~50)
// -------------------
export const BASKETBALL_CARDS: CardDefinition[] = [
  // Mild (Common Events)
  { sport: "basketball", title: "Made 3-Pointer", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Missed 3-Pointer", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Made Free Throw", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Missed Free Throw", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Made Layup", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Missed Layup", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  { sport: "basketball", title: "Defensive Rebound", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Offensive Rebound", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  { sport: "basketball", title: "Turnover", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Steal", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Block", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  { sport: "basketball", title: "Personal Foul", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Shooting Foul", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  { sport: "basketball", title: "Timeout", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Replay Review", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  { sport: "basketball", title: "Airball", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 2 },
  { sport: "basketball", title: "Traveling", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 2 },
  { sport: "basketball", title: "Double Dribble", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 2 },
  { sport: "basketball", title: "Shot Clock Violation", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 2 },

  { sport: "basketball", title: "Out of Bounds Turnover", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Fast Break Score", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  // Moderate (Hype Events)
  { sport: "basketball", title: "Dunk", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 3 },
  { sport: "basketball", title: "Alley-Oop Dunk", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 4 },
  { sport: "basketball", title: "And-One", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 3 },
  { sport: "basketball", title: "4-Point Play", description: PENALTIES.THREE_DRINKS, severity: "moderate", type: "penalty", points: 5 },

  { sport: "basketball", title: "Technical Foul", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 4 },
  { sport: "basketball", title: "Coach Challenge", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 3 },

  { sport: "basketball", title: "Player Fouls Out", description: PENALTIES.THREE_DRINKS, severity: "moderate", type: "penalty", points: 5 },
  { sport: "basketball", title: "10–0 Run", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 4 },

  // Severe (Rare / Big Moments) — card-holder only
  { sport: "basketball", title: "Buzzer Beater (End of Quarter)", description: PENALTIES.SHOT, severity: "severe", type: "penalty", points: 6 },
  { sport: "basketball", title: "Game-Winning Shot", description: PENALTIES.SHOTGUN, severity: "severe", type: "penalty", points: 8 },
  { sport: "basketball", title: "Half-Court Shot Made", description: PENALTIES.FINISH, severity: "severe", type: "penalty", points: 8 },
  { sport: "basketball", title: "Overtime", description: PENALTIES.FINISH, severity: "severe", type: "penalty", points: 7 },
  { sport: "basketball", title: "Flagrant Foul", description: PENALTIES.FINISH_HALF, severity: "severe", type: "penalty", points: 7 },
  { sport: "basketball", title: "Player Ejected", description: PENALTIES.SHOTGUN, severity: "severe", type: "penalty", points: 8 },

  // Fun / Broadcast Moments
  { sport: "basketball", title: "Announcer Says 'Heat Check'", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Celebrity Shown Courtside", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Coach Looks Furious", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Player Complains to Ref", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Bench Celebration", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Slow Motion Replay", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  // Commercial Cards
  { sport: "basketball", title: "Beer Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Car Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Fast Food Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Sports Betting Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Insurance Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },

  { sport: "basketball", title: "Animal in a Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Celebrity in a Commercial", description: PENALTIES.DRINK, severity: "mild", type: "penalty", points: 1 },
  { sport: "basketball", title: "Same Commercial Plays Twice", description: PENALTIES.TWO_DRINKS, severity: "moderate", type: "penalty", points: 3 },
];

export function getCardsForSport(sport: Sport): CardDefinition[] {
  switch (sport) {
    case "football":
      return FOOTBALL_CARDS;
    case "basketball":
      return BASKETBALL_CARDS;
    default:
      return [];
  }
}
