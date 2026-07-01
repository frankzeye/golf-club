-- CreateTable
CREATE TABLE "MemberFavorite" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "favoriteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberFavorite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MemberFavorite_userId_idx" ON "MemberFavorite"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberFavorite_userId_favoriteId_key" ON "MemberFavorite"("userId", "favoriteId");

-- AddForeignKey
ALTER TABLE "MemberFavorite" ADD CONSTRAINT "MemberFavorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberFavorite" ADD CONSTRAINT "MemberFavorite_favoriteId_fkey" FOREIGN KEY ("favoriteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
