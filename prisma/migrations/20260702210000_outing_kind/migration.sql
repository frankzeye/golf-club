-- Distinguish play rounds from social round outings.
ALTER TABLE "Outing" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'social';
