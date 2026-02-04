import { config } from "dotenv";

// Load environment variables FIRST before importing anything that uses them
config();

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
