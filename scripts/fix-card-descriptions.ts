/**
 * One-off script: update Card rows in the DB that had placeholder descriptions.
 * Run with: npx tsx scripts/fix-card-descriptions.ts
 * Or: npm run db:fix-card-descriptions
 */
import "dotenv/config";
import { prisma } from "../lib/db/prisma";

const FIXES: Array<{ sport: string; title: string; description: string }> = [
  { sport: "basketball", title: "Technical Foul", description: "Take 2 drinks" },
  { sport: "basketball", title: "Player Dunk", description: "Take 2 drinks" },
];

async function main() {
  for (const { sport, title, description } of FIXES) {
    const result = await prisma.card.updateMany({
      where: { sport, title },
      data: { description },
    });
    if (result.count > 0) {
      console.log(`Updated "${title}" (${sport}): description → "${description}"`);
    } else {
      console.log(`No card found for "${title}" (${sport}) – may already be correct or not seeded.`);
    }
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
