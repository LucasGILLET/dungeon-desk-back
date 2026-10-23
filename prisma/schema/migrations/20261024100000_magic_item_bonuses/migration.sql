-- AlterTable
ALTER TABLE "MagicItem" ADD COLUMN     "armorBonus" INTEGER,
ADD COLUMN     "weaponBonus" INTEGER;


-- Contraintes CHECK (ajoutées à la main, voir docs/modelisation/conventions.md)
ALTER TABLE "MagicItem" ADD CONSTRAINT "MagicItem_bonuses"
  CHECK (("weaponBonus" IS NULL OR "weaponBonus" BETWEEN 1 AND 5) AND ("armorBonus" IS NULL OR "armorBonus" BETWEEN 1 AND 5));

-- Un objet magique peut se poser sur un objet de base (« Arme, +1 » sur une
-- épée longue) : équipement et objet magique ensemble sont désormais permis
ALTER TABLE "CharacterItem" DROP CONSTRAINT "CharacterItem_catalog_or_named";
ALTER TABLE "CharacterItem" ADD CONSTRAINT "CharacterItem_catalog_or_named"
  CHECK (num_nonnulls("equipmentId", "magicItemId", "name") >= 1 AND "quantity" >= 0);
