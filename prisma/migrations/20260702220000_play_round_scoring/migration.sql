-- Live scoring play rounds (separate from social outings).

CREATE TABLE "PlayRound" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "courseId" TEXT,
    "holeCount" INTEGER NOT NULL DEFAULT 18,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlayRound_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlayRoundPlayer" (
    "id" TEXT NOT NULL,
    "playRoundId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scores" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "PlayRoundPlayer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayRound_slug_key" ON "PlayRound"("slug");

CREATE UNIQUE INDEX "PlayRoundPlayer_playRoundId_userId_key" ON "PlayRoundPlayer"("playRoundId", "userId");

ALTER TABLE "PlayRound" ADD CONSTRAINT "PlayRound_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "GolfCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PlayRound" ADD CONSTRAINT "PlayRound_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayRoundPlayer" ADD CONSTRAINT "PlayRoundPlayer_playRoundId_fkey" FOREIGN KEY ("playRoundId") REFERENCES "PlayRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlayRoundPlayer" ADD CONSTRAINT "PlayRoundPlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
