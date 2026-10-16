-- Une clé primaire n'est jamais aussi une clé étrangère : Directus ne suit pas
-- une relation au-delà d'un niveau quand la clé primaire d'une table est elle-même
-- une clé étrangère (WeaponStats.equipmentId…). Les tables 1-1 reçoivent un `id`,
-- l'ancienne clé devient unique, et les liaisons sont remappées sans perte.

-- Liens à réorienter : on retire d'abord les clés étrangères
ALTER TABLE "WeaponStatsProperty" DROP CONSTRAINT "WeaponStatsProperty_weaponId_fkey";
ALTER TABLE "SpellcastingSection" DROP CONSTRAINT "SpellcastingSection_classId_fkey";

-- Nouvelle clé primaire `id` ; l'ancienne devient unique
ALTER TABLE "WeaponStats" DROP CONSTRAINT "WeaponStats_pkey",
ADD COLUMN "id" SERIAL NOT NULL,
ADD CONSTRAINT "WeaponStats_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "WeaponStats_equipmentId_key" ON "WeaponStats"("equipmentId");

ALTER TABLE "ArmorStats" DROP CONSTRAINT "ArmorStats_pkey",
ADD COLUMN "id" SERIAL NOT NULL,
ADD CONSTRAINT "ArmorStats_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "ArmorStats_equipmentId_key" ON "ArmorStats"("equipmentId");

ALTER TABLE "VehicleStats" DROP CONSTRAINT "VehicleStats_pkey",
ADD COLUMN "id" SERIAL NOT NULL,
ADD CONSTRAINT "VehicleStats_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "VehicleStats_equipmentId_key" ON "VehicleStats"("equipmentId");

ALTER TABLE "ClassSpellcasting" DROP CONSTRAINT "ClassSpellcasting_pkey",
ADD COLUMN "id" SERIAL NOT NULL,
ADD CONSTRAINT "ClassSpellcasting_pkey" PRIMARY KEY ("id");
CREATE UNIQUE INDEX "ClassSpellcasting_classId_key" ON "ClassSpellcasting"("classId");

-- Propriétés d'arme : weaponId contenait l'id de l'objet, il désigne maintenant WeaponStats.id
UPDATE "WeaponStatsProperty" p SET "weaponId" = w."id" FROM "WeaponStats" w WHERE w."equipmentId" = p."weaponId";
ALTER TABLE "WeaponStatsProperty" ADD CONSTRAINT "WeaponStatsProperty_weaponId_fkey"
  FOREIGN KEY ("weaponId") REFERENCES "WeaponStats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Rubriques d'incantation : classId (id de la classe) → spellcastingId (ClassSpellcasting.id)
ALTER TABLE "SpellcastingSection" ADD COLUMN "spellcastingId" INTEGER;
UPDATE "SpellcastingSection" s SET "spellcastingId" = c."id" FROM "ClassSpellcasting" c WHERE c."classId" = s."classId";
ALTER TABLE "SpellcastingSection" ALTER COLUMN "spellcastingId" SET NOT NULL;
ALTER TABLE "SpellcastingSection" DROP COLUMN "classId";
ALTER TABLE "SpellcastingSection" ADD CONSTRAINT "SpellcastingSection_spellcastingId_fkey"
  FOREIGN KEY ("spellcastingId") REFERENCES "ClassSpellcasting"("id") ON DELETE CASCADE ON UPDATE CASCADE;
