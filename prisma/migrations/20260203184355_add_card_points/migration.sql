-- AlterTable
ALTER TABLE "Card" ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Card_severity_idx" ON "Card"("severity");
