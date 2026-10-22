-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "shareCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Character_shareCode_key" ON "Character"("shareCode");

