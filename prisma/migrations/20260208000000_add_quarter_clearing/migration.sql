-- AlterTable
ALTER TABLE "Room" ADD COLUMN "allowQuarterClearing" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "currentQuarter" TEXT,
ADD COLUMN "canTurnInCards" BOOLEAN NOT NULL DEFAULT true;
