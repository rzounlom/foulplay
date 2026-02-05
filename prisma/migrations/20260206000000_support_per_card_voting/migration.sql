-- Drop existing constraint and index
ALTER TABLE "CardVote" DROP CONSTRAINT IF EXISTS "CardVote_submissionId_fkey";
DROP INDEX IF EXISTS "CardVote_submissionId_voterPlayerId_key";

-- Add cardInstanceId column as nullable first
ALTER TABLE "CardVote" ADD COLUMN "cardInstanceId" TEXT;

-- Migrate existing votes to have cardInstanceId
-- For each vote, find the card instance in the submission
-- If multiple cards in submission, assign to first one (we'll handle duplicates)
UPDATE "CardVote" cv
SET "cardInstanceId" = (
  SELECT ci.id
  FROM "CardInstance" ci
  WHERE ci."submissionId" = cv."submissionId"
  ORDER BY ci."createdAt"
  LIMIT 1
);

-- Delete duplicate votes (same voter voting on same card instance)
DELETE FROM "CardVote" cv1
WHERE EXISTS (
  SELECT 1 FROM "CardVote" cv2
  WHERE cv2."cardInstanceId" = cv1."cardInstanceId"
    AND cv2."voterPlayerId" = cv1."voterPlayerId"
    AND cv2."id" < cv1."id"
);

-- Now make cardInstanceId NOT NULL
ALTER TABLE "CardVote" ALTER COLUMN "cardInstanceId" SET NOT NULL;

-- Create new indexes
CREATE UNIQUE INDEX "CardVote_cardInstanceId_voterPlayerId_key" ON "CardVote"("cardInstanceId", "voterPlayerId");
CREATE INDEX "CardVote_cardInstanceId_idx" ON "CardVote"("cardInstanceId");

-- Add foreign key constraints
ALTER TABLE "CardVote" ADD CONSTRAINT "CardVote_cardInstanceId_fkey" FOREIGN KEY ("cardInstanceId") REFERENCES "CardInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CardVote" ADD CONSTRAINT "CardVote_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CardSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
