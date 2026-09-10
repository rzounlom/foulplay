-- One-time purchases + webhook idempotency (Game Night pass, lifetime access)
ALTER TABLE "User" ADD COLUMN "gameNightPassExpiresAt" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "lifetimeAccess" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Room" ADD COLUMN "playerLimitWaiters" JSONB;

CREATE TABLE "StripeWebhookEvent" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StripeWebhookEvent_pkey" PRIMARY KEY ("id")
);
