-- CreateTable
CREATE TABLE "GolfCourse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "par" INTEGER,
    "detailsJson" JSONB,
    "detailsCachedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GolfCourse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GolfCourse_name_idx" ON "GolfCourse"("name");

-- CreateIndex
CREATE INDEX "GolfCourse_state_idx" ON "GolfCourse"("state");

-- AlterTable
ALTER TABLE "User" ADD COLUMN "homeCourseId" TEXT;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN "courseId" TEXT;

-- AlterTable
ALTER TABLE "Outing" ADD COLUMN "courseId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_homeCourseId_fkey" FOREIGN KEY ("homeCourseId") REFERENCES "GolfCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "GolfCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Outing" ADD CONSTRAINT "Outing_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "GolfCourse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
