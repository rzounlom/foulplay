import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

function isUniqueConstraintError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return true;
  }
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code: unknown }).code === "P2002",
  );
}

/**
 * Claim a Stripe event ID. Returns false if this event was already processed.
 * Delete the claim if handler work fails so Stripe retries can succeed.
 */
export async function claimStripeWebhookEvent(
  eventId: string,
  eventType: string,
): Promise<boolean> {
  try {
    await prisma.stripeWebhookEvent.create({
      data: { id: eventId, type: eventType },
    });
    return true;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return false;
    }
    throw error;
  }
}

export async function releaseStripeWebhookEvent(eventId: string): Promise<void> {
  await prisma.stripeWebhookEvent.deleteMany({ where: { id: eventId } });
}
