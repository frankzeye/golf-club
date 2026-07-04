-- AlterTable
ALTER TABLE "TournamentRegistration" ADD COLUMN "handicapIndex" DOUBLE PRECISION;

-- Backfill from member profiles
UPDATE "TournamentRegistration" AS r
SET "handicapIndex" = u."handicapIndex"
FROM "User" AS u
WHERE r."userId" = u.id;
