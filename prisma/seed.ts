// Load environment variables FIRST - must be imported before anything else
// This automatically loads .env from the project root
import "dotenv/config";

// Verify DATABASE_URL is set before importing prisma
if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL environment variable is not set!");
  console.error("Please ensure you have a .env file in the project root with DATABASE_URL set.");
  console.error(`Current working directory: ${process.cwd()}`);
  process.exit(1);
}

import { prisma } from "../lib/db/prisma";
import { FOOTBALL_CARDS, BASKETBALL_CARDS } from "../lib/game/cards";

async function main() {
  console.log("Seeding cards...");

  // Clear existing cards
  await prisma.card.deleteMany({});

  // Insert football cards
  for (const card of FOOTBALL_CARDS) {
    await prisma.card.create({
      data: {
        sport: card.sport,
        title: card.title,
        description: card.description,
        severity: card.severity,
        type: card.type,
        points: card.points || 0,
      },
    });
  }

  // Insert basketball cards
  for (const card of BASKETBALL_CARDS) {
    await prisma.card.create({
      data: {
        sport: card.sport,
        title: card.title,
        description: card.description,
        severity: card.severity,
        type: card.type,
        points: card.points || 0,
      },
    });
  }

  console.log(`Seeded ${FOOTBALL_CARDS.length} football cards and ${BASKETBALL_CARDS.length} basketball cards`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
