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
  console.log("Seeding cards (insert missing titles only; never deletes)...");

  const existing = await prisma.card.findMany({
    select: { sport: true, title: true },
  });
  const existingKeys = new Set(
    existing.map((card) => `${card.sport}::${card.title}`),
  );

  const allCards = [...FOOTBALL_CARDS, ...BASKETBALL_CARDS];
  let inserted = 0;
  for (const card of allCards) {
    const key = `${card.sport}::${card.title}`;
    if (existingKeys.has(key)) continue;
    await prisma.card.create({
      data: {
        sport: card.sport,
        title: card.title,
        description: card.description,
        severity: card.severity,
        type: card.type,
        points: card.points || 0,
        tier: card.tier,
      },
    });
    inserted += 1;
    existingKeys.add(key);
  }

  console.log(
    `Card catalog: ${allCards.length} definitions, ${inserted} inserted, ${existingKeys.size} titles now in DB. Existing rows were not deleted.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
