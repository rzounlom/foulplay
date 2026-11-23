import { prisma } from "@/lib/db/prisma";
import { filterDealableCards } from "@/lib/game/launch-decks";

export async function findDealableCards(sport: string) {
  const cards = await prisma.card.findMany({
    where: { sport },
    orderBy: { id: "asc" },
  });
  return filterDealableCards(sport, cards);
}
