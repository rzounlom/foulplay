-- AlterTable
ALTER TABLE "Room" ADD COLUMN "rematchReadyUserIds" JSONB;
ALTER TABLE "Room" ADD COLUMN "rematchSpawnCode" TEXT;
ALTER TABLE "Room" ADD COLUMN "rematchSpawnMembers" JSONB;
