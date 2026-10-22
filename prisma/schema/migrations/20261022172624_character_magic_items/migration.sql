-- AlterTable
ALTER TABLE "CharacterItem" ADD COLUMN     "magicItemId" INTEGER;

-- AddForeignKey
ALTER TABLE "CharacterItem" ADD CONSTRAINT "CharacterItem_magicItemId_fkey" FOREIGN KEY ("magicItemId") REFERENCES "MagicItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
