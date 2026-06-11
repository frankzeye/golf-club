-- Multiple choice options can be thumbnail images instead of (or alongside) text
ALTER TABLE "SurveyDateOption" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;
