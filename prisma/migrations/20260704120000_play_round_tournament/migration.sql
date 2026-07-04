-- AlterTable
ALTER TABLE "PlayRound" ADD COLUMN "tournamentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "PlayRound_tournamentId_key" ON "PlayRound"("tournamentId");

-- AddForeignKey
ALTER TABLE "PlayRound" ADD CONSTRAINT "PlayRound_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE SET NULL ON UPDATE CASCADE;
