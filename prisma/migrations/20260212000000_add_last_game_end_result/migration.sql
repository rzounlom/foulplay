-- AlterTable
ALTER TABLE "Room" ADD COLUMN IF NOT EXISTS "lastGameEndResult" JSONB;
