-- CreateTable
CREATE TABLE "GameState" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "currentTurnPlayerId" TEXT NOT NULL,
    "activeCardInstanceId" TEXT,
    "deckSeed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Card" (
    "id" TEXT NOT NULL,
    "sport" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Card_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardInstance" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "drawnById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'drawn',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardSubmission" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "cardInstanceId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CardSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardVote" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "voterPlayerId" TEXT NOT NULL,
    "vote" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardVote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameState_roomId_key" ON "GameState"("roomId");

-- CreateIndex
CREATE UNIQUE INDEX "GameState_activeCardInstanceId_key" ON "GameState"("activeCardInstanceId");

-- CreateIndex
CREATE INDEX "Card_sport_idx" ON "Card"("sport");

-- CreateIndex
CREATE INDEX "CardInstance_roomId_idx" ON "CardInstance"("roomId");

-- CreateIndex
CREATE INDEX "CardInstance_drawnById_idx" ON "CardInstance"("drawnById");

-- CreateIndex
CREATE UNIQUE INDEX "CardSubmission_cardInstanceId_key" ON "CardSubmission"("cardInstanceId");

-- CreateIndex
CREATE INDEX "CardSubmission_roomId_idx" ON "CardSubmission"("roomId");

-- CreateIndex
CREATE INDEX "CardSubmission_submittedById_idx" ON "CardSubmission"("submittedById");

-- CreateIndex
CREATE INDEX "CardVote_submissionId_idx" ON "CardVote"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "CardVote_submissionId_voterPlayerId_key" ON "CardVote"("submissionId", "voterPlayerId");

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_currentTurnPlayerId_fkey" FOREIGN KEY ("currentTurnPlayerId") REFERENCES "Player"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameState" ADD CONSTRAINT "GameState_activeCardInstanceId_fkey" FOREIGN KEY ("activeCardInstanceId") REFERENCES "CardInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInstance" ADD CONSTRAINT "CardInstance_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInstance" ADD CONSTRAINT "CardInstance_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "Card"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardInstance" ADD CONSTRAINT "CardInstance_drawnById_fkey" FOREIGN KEY ("drawnById") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardSubmission" ADD CONSTRAINT "CardSubmission_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardSubmission" ADD CONSTRAINT "CardSubmission_cardInstanceId_fkey" FOREIGN KEY ("cardInstanceId") REFERENCES "CardInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardSubmission" ADD CONSTRAINT "CardSubmission_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardVote" ADD CONSTRAINT "CardVote_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "CardSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardVote" ADD CONSTRAINT "CardVote_voterPlayerId_fkey" FOREIGN KEY ("voterPlayerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
