-- Survey: add type, custom title, and single/multi select flag
-- month/year become optional (multiple choice surveys have neither)
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'availability';
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "allowMultiple" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Survey" ALTER COLUMN "month" DROP NOT NULL;
ALTER TABLE "Survey" ALTER COLUMN "year" DROP NOT NULL;

-- SurveyDateOption: add text labels for multiple choice options and make date optional
ALTER TABLE "SurveyDateOption" ADD COLUMN IF NOT EXISTS "label" TEXT;
ALTER TABLE "SurveyDateOption" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SurveyDateOption" ALTER COLUMN "date" DROP NOT NULL;

-- Unique label per survey (PostgreSQL allows multiple NULLs, so date options are unaffected)
CREATE UNIQUE INDEX IF NOT EXISTS "SurveyDateOption_surveyId_label_key" ON "SurveyDateOption"("surveyId", "label");
