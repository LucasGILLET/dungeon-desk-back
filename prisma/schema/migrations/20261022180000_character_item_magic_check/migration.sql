-- Objets magiques dans l'inventaire : la contrainte écrite à la main dans
-- 20261017100000_character_model n'acceptait qu'un objet du catalogue ou un
-- nom. Un objet est désormais un équipement, un objet magique ou un objet
-- libre nommé, jamais à la fois équipement et objet magique.
ALTER TABLE "CharacterItem" DROP CONSTRAINT "CharacterItem_catalog_or_named";
ALTER TABLE "CharacterItem" ADD CONSTRAINT "CharacterItem_catalog_or_named"
  CHECK (num_nonnulls("equipmentId", "magicItemId", "name") >= 1
    AND num_nonnulls("equipmentId", "magicItemId") <= 1
    AND "quantity" >= 0);
