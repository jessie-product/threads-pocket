-- CreateTable
CREATE TABLE "Folder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Folder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Folder_name_key" ON "Folder"("name");

-- AlterTable
ALTER TABLE "ThreadPost" ADD COLUMN "folderId" TEXT;

-- Backfill folders from the legacy category column.
INSERT INTO "Folder" ("id", "name", "createdAt", "updatedAt")
SELECT
    'folder_' || md5("category") AS "id",
    "category" AS "name",
    CURRENT_TIMESTAMP AS "createdAt",
    CURRENT_TIMESTAMP AS "updatedAt"
FROM (
    SELECT DISTINCT "category"
    FROM "ThreadPost"
    WHERE "category" IS NOT NULL AND btrim("category") <> ''
) AS categories
ON CONFLICT ("name") DO NOTHING;

UPDATE "ThreadPost"
SET "folderId" = "Folder"."id"
FROM "Folder"
WHERE "ThreadPost"."category" = "Folder"."name";

-- CreateIndex
CREATE INDEX "ThreadPost_folderId_idx" ON "ThreadPost"("folderId");

-- AddForeignKey
ALTER TABLE "ThreadPost" ADD CONSTRAINT "ThreadPost_folderId_fkey"
FOREIGN KEY ("folderId") REFERENCES "Folder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
