import { prisma } from "@/lib/db/prisma";
import { nextGameNightExpiry } from "@/lib/billing/entitlements";
import type { BillingPlanId } from "@/lib/billing/plans";

export async function grantGameNightPass(
  userId: string,
  now: Date = new Date(),
): Promise<Date> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { gameNightPassExpiresAt: true },
  });
  if (!user) {
    throw new Error(`grantGameNightPass: user not found ${userId}`);
  }
  const expiresAt = nextGameNightExpiry(user.gameNightPassExpiresAt, now);
  await prisma.user.update({
    where: { id: userId },
    data: { gameNightPassExpiresAt: expiresAt },
  });
  return expiresAt;
}

export async function grantLifetimeAccess(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { lifetimeAccess: true },
  });
}

export async function grantCheckoutPlan(
  userId: string,
  plan: BillingPlanId,
  now: Date = new Date(),
): Promise<void> {
  if (plan === "game_night") {
    await grantGameNightPass(userId, now);
    return;
  }
  if (plan === "lifetime") {
    await grantLifetimeAccess(userId);
  }
}
