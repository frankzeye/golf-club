-- AlterTable
ALTER TABLE "Survey" ADD COLUMN IF NOT EXISTS "slug" TEXT;

-- Unique index (PostgreSQL allows multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS "Survey_slug_key" ON "Survey"("slug");
