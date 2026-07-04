-- CreateTable
CREATE TABLE "TournamentFlight" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "minHandicap" DOUBLE PRECISION,
    "maxHandicap" DOUBLE PRECISION,

    CONSTRAINT "TournamentFlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentFlightMember" (
    "id" TEXT NOT NULL,
    "flightId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "TournamentFlightMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TournamentFlight_tournamentId_idx" ON "TournamentFlight"("tournamentId");

-- CreateIndex
CREATE INDEX "TournamentFlightMember_userId_idx" ON "TournamentFlightMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TournamentFlightMember_flightId_userId_key" ON "TournamentFlightMember"("flightId", "userId");

-- AddForeignKey
ALTER TABLE "TournamentFlight" ADD CONSTRAINT "TournamentFlight_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentFlightMember" ADD CONSTRAINT "TournamentFlightMember_flightId_fkey" FOREIGN KEY ("flightId") REFERENCES "TournamentFlight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentFlightMember" ADD CONSTRAINT "TournamentFlightMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
