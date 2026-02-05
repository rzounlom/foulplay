-- AlterTable
ALTER TABLE "Room" ADD COLUMN "showPoints" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN "nickname" TEXT;
