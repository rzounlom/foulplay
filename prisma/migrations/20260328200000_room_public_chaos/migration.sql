-- Drop-in "public chaos" rooms (matchmaking, mid-game joins)
ALTER TABLE "Room" ADD COLUMN "isPublicChaos" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Room_public_chaos_list_idx" ON "Room" ("isPublicChaos", "status", "updatedAt");
