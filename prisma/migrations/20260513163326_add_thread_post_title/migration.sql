-- AlterTable
ALTER TABLE "ThreadPost" ADD COLUMN "title" TEXT;

-- Backfill existing rows so the column can safely become required.
UPDATE "ThreadPost"
SET "title" = "url"
WHERE "title" IS NULL;

ALTER TABLE "ThreadPost" ALTER COLUMN "title" SET NOT NULL;
