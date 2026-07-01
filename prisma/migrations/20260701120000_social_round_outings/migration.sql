-- CreateTable
CREATE TABLE "Outing" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "playerCount" INTEGER NOT NULL,
    "course" TEXT NOT NULL,
    "hasBookedTime" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3),
    "startTime" TEXT,
    "timeOfDay" TEXT,
    "hasWager" BOOLEAN NOT NULL DEFAULT false,
    "wagerDetails" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Outing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutingParticipant" (
    "id" TEXT NOT NULL,
    "outingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'player',
    "status" TEXT NOT NULL DEFAULT 'invited',

    CONSTRAINT "OutingParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Outing_slug_key" ON "Outing"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "OutingParticipant_outingId_userId_key" ON "OutingParticipant"("outingId", "userId");

-- AddForeignKey
ALTER TABLE "Outing" ADD CONSTRAINT "Outing_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutingParticipant" ADD CONSTRAINT "OutingParticipant_outingId_fkey" FOREIGN KEY ("outingId") REFERENCES "Outing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OutingParticipant" ADD CONSTRAINT "OutingParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
