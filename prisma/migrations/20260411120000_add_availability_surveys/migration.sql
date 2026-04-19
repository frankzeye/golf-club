-- CreateTable
CREATE TABLE "Survey" (
    "id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyDateOption" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "date" DATE NOT NULL,

    CONSTRAINT "SurveyDateOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SurveyDateSelection" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,

    CONSTRAINT "SurveyDateSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SurveyDateOption_surveyId_date_key" ON "SurveyDateOption"("surveyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "SurveyDateSelection_surveyId_userId_optionId_key" ON "SurveyDateSelection"("surveyId", "userId", "optionId");

-- AddForeignKey
ALTER TABLE "Survey" ADD CONSTRAINT "Survey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyDateOption" ADD CONSTRAINT "SurveyDateOption_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyDateSelection" ADD CONSTRAINT "SurveyDateSelection_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyDateSelection" ADD CONSTRAINT "SurveyDateSelection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveyDateSelection" ADD CONSTRAINT "SurveyDateSelection_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "SurveyDateOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;
