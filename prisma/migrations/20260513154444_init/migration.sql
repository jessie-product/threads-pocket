-- CreateTable
CREATE TABLE "ThreadPost" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "content" TEXT,
    "summary" TEXT,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ThreadPost_pkey" PRIMARY KEY ("id")
);
