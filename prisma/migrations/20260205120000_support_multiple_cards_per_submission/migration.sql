-- Step 1: Add submissionId column to CardInstance (nullable) if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CardInstance' AND column_name = 'submissionId') THEN
    ALTER TABLE "CardInstance" ADD COLUMN "submissionId" TEXT;
  END IF;
END $$;

-- Step 2: Migrate existing data - link CardInstances to their submissions (if cardInstanceId column exists)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CardSubmission' AND column_name = 'cardInstanceId') THEN
    UPDATE "CardInstance"
    SET "submissionId" = "CardSubmission"."id"
    FROM "CardSubmission"
    WHERE "CardSubmission"."cardInstanceId" = "CardInstance"."id";
  END IF;
END $$;

-- Step 3: Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CardInstance_submissionId_fkey') THEN
    ALTER TABLE "CardInstance" ADD CONSTRAINT "CardInstance_submissionId_fkey" 
      FOREIGN KEY ("submissionId") REFERENCES "CardSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 4: Create index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS "CardInstance_submissionId_idx" ON "CardInstance"("submissionId");

-- Step 5: Drop the old unique constraint and column from CardSubmission if they exist
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'CardSubmission_cardInstanceId_key') THEN
    ALTER TABLE "CardSubmission" DROP CONSTRAINT "CardSubmission_cardInstanceId_key";
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'CardSubmission' AND column_name = 'cardInstanceId') THEN
    ALTER TABLE "CardSubmission" DROP COLUMN "cardInstanceId";
  END IF;
END $$;
