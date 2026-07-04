-- CreateTable
CREATE TABLE "TournamentFoursome" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TournamentFoursome_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentFoursomeMember" (
    "id" TEXT NOT NULL,
    "foursomeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TournamentFoursomeMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentFoursome_tournamentId_idx" ON "TournamentFoursome"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentFoursomeMember_userId_idx" ON "TournamentFoursomeMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentFoursomeMember_foursomeId_userId_key" ON "TournamentFoursomeMember"("foursomeId", "userId");

-- AddForeignKey
ALTER TABLE "TournamentFoursome" ADD CONSTRAINT "TournamentFoursome_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentFoursomeMember" ADD CONSTRAINT "TournamentFoursomeMember_foursomeId_fkey" FOREIGN KEY ("foursomeId") REFERENCES "TournamentFoursome"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentFoursomeMember" ADD CONSTRAINT "TournamentFoursomeMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
