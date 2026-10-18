-- CreateEnum
CREATE TYPE "ArmorClassSource" AS ENUM ('NATURAL', 'ARMOR', 'DEXTERITY', 'SPELL', 'CONDITION');

-- CreateEnum
CREATE TYPE "DamageModifierKind" AS ENUM ('VULNERABILITY', 'RESISTANCE', 'IMMUNITY');

-- CreateEnum
CREATE TYPE "MonsterActionKind" AS ENUM ('TRAIT', 'ACTION', 'BONUS_ACTION', 'REACTION', 'LEGENDARY', 'LAIR');

-- CreateEnum
CREATE TYPE "MonsterAttackType" AS ENUM ('MELEE_WEAPON', 'RANGED_WEAPON', 'MELEE_OR_RANGED_WEAPON', 'MELEE_SPELL', 'RANGED_SPELL');

-- CreateEnum
CREATE TYPE "MagicItemRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'VERY_RARE', 'LEGENDARY', 'ARTIFACT', 'VARIES');

-- CreateTable
CREATE TABLE "CreatureSubtype" (
    "id" SERIAL NOT NULL,
    "index" TEXT NOT NULL,

    CONSTRAINT "CreatureSubtype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatureSubtypeTranslation" (
    "id" SERIAL NOT NULL,
    "creatureSubtypeId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CreatureSubtypeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Monster" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "size" "Size" NOT NULL,
    "creatureTypeId" INTEGER NOT NULL,
    "swarmOfSize" "Size",
    "isUnaligned" BOOLEAN NOT NULL DEFAULT false,
    "hitPoints" INTEGER NOT NULL,
    "hitDiceCount" INTEGER NOT NULL,
    "hitDieSize" INTEGER NOT NULL,
    "hitPointBonus" INTEGER NOT NULL DEFAULT 0,
    "speeds" JSONB NOT NULL,
    "strength" INTEGER NOT NULL,
    "dexterity" INTEGER NOT NULL,
    "constitution" INTEGER NOT NULL,
    "intelligence" INTEGER NOT NULL,
    "wisdom" INTEGER NOT NULL,
    "charisma" INTEGER NOT NULL,
    "senses" JSONB NOT NULL,
    "passivePerception" INTEGER NOT NULL,
    "telepathyFt" INTEGER,
    "initiativeBonus" INTEGER,
    "challengeRating" DECIMAL(5,3) NOT NULL,
    "xp" INTEGER NOT NULL,
    "legendaryActionsPerRound" INTEGER,
    "imageUrl" TEXT,
    "source" "ContentSource" NOT NULL DEFAULT 'SRD',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Monster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterTranslation" (
    "id" SERIAL NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "languagesText" TEXT,

    CONSTRAINT "MonsterTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterSubtype" (
    "id" SERIAL NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "creatureSubtypeId" INTEGER NOT NULL,

    CONSTRAINT "MonsterSubtype_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterAlignment" (
    "id" SERIAL NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "alignmentId" INTEGER NOT NULL,

    CONSTRAINT "MonsterAlignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterArmorClass" (
    "id" SERIAL NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "sourceType" "ArmorClassSource" NOT NULL,
    "spellId" INTEGER,
    "conditionId" INTEGER,

    CONSTRAINT "MonsterArmorClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterArmorClassTranslation" (
    "id" SERIAL NOT NULL,
    "armorClassId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "note" TEXT NOT NULL,

    CONSTRAINT "MonsterArmorClassTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterArmorClassEquipment" (
    "id" SERIAL NOT NULL,
    "armorClassId" INTEGER NOT NULL,
    "equipmentId" INTEGER NOT NULL,

    CONSTRAINT "MonsterArmorClassEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterSavingThrow" (
    "id" SERIAL NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL,

    CONSTRAINT "MonsterSavingThrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterSkill" (
    "id" SERIAL NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "skillId" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL,

    CONSTRAINT "MonsterSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterDamageModifier" (
    "id" SERIAL NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "kind" "DamageModifierKind" NOT NULL,
    "damageTypeId" INTEGER,
    "nonMagicalOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MonsterDamageModifier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterDamageModifierTranslation" (
    "id" SERIAL NOT NULL,
    "damageModifierId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "note" TEXT NOT NULL,

    CONSTRAINT "MonsterDamageModifierTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterConditionImmunity" (
    "id" SERIAL NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "conditionId" INTEGER NOT NULL,

    CONSTRAINT "MonsterConditionImmunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterLanguage" (
    "id" SERIAL NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "languageId" INTEGER NOT NULL,
    "understandOnly" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MonsterLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterAction" (
    "id" SERIAL NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "kind" "MonsterActionKind" NOT NULL,
    "position" INTEGER NOT NULL,
    "attackType" "MonsterAttackType",
    "attackBonus" INTEGER,
    "reachFt" INTEGER,
    "normalRangeFt" INTEGER,
    "longRangeFt" INTEGER,
    "saveAbilityId" INTEGER,
    "saveDc" INTEGER,
    "saveSuccess" "SaveSuccess",
    "usage" JSONB,
    "legendaryCost" INTEGER,

    CONSTRAINT "MonsterAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterActionTranslation" (
    "id" SERIAL NOT NULL,
    "actionId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "MonsterActionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterActionDamage" (
    "id" SERIAL NOT NULL,
    "actionId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "dice" TEXT NOT NULL,
    "damageTypeId" INTEGER NOT NULL,
    "alternativeGroup" INTEGER,

    CONSTRAINT "MonsterActionDamage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterMultiattackStep" (
    "id" SERIAL NOT NULL,
    "position" INTEGER NOT NULL,
    "multiattackId" INTEGER NOT NULL,
    "targetActionId" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,
    "alternativeGroup" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MonsterMultiattackStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterSpellcasting" (
    "id" SERIAL NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "actionId" INTEGER NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,
    "saveDc" INTEGER,
    "attackBonus" INTEGER,
    "casterLevel" INTEGER,
    "classId" INTEGER,
    "slots" JSONB,

    CONSTRAINT "MonsterSpellcasting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterSpell" (
    "id" SERIAL NOT NULL,
    "spellcastingId" INTEGER NOT NULL,
    "spellId" INTEGER NOT NULL,
    "usage" JSONB,

    CONSTRAINT "MonsterSpell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonsterForm" (
    "id" SERIAL NOT NULL,
    "monsterId" INTEGER NOT NULL,
    "formMonsterId" INTEGER NOT NULL,

    CONSTRAINT "MonsterForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicItem" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "equipmentCategoryId" INTEGER NOT NULL,
    "rarity" "MagicItemRarity" NOT NULL,
    "requiresAttunement" BOOLEAN NOT NULL DEFAULT false,
    "parentId" INTEGER,
    "imageUrl" TEXT,
    "source" "ContentSource" NOT NULL DEFAULT 'SRD',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MagicItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicItemTranslation" (
    "id" SERIAL NOT NULL,
    "magicItemId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT NOT NULL,

    CONSTRAINT "MagicItemTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CreatureSubtype_index_key" ON "CreatureSubtype"("index");

-- CreateIndex
CREATE UNIQUE INDEX "CreatureSubtypeTranslation_creatureSubtypeId_localeCode_key" ON "CreatureSubtypeTranslation"("creatureSubtypeId", "localeCode");

-- CreateIndex
CREATE INDEX "Monster_editionId_challengeRating_idx" ON "Monster"("editionId", "challengeRating");

-- CreateIndex
CREATE UNIQUE INDEX "Monster_editionId_index_key" ON "Monster"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterTranslation_monsterId_localeCode_key" ON "MonsterTranslation"("monsterId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterSubtype_monsterId_creatureSubtypeId_key" ON "MonsterSubtype"("monsterId", "creatureSubtypeId");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterAlignment_monsterId_alignmentId_key" ON "MonsterAlignment"("monsterId", "alignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterArmorClassTranslation_armorClassId_localeCode_key" ON "MonsterArmorClassTranslation"("armorClassId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterArmorClassEquipment_armorClassId_equipmentId_key" ON "MonsterArmorClassEquipment"("armorClassId", "equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterSavingThrow_monsterId_abilityScoreId_key" ON "MonsterSavingThrow"("monsterId", "abilityScoreId");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterSkill_monsterId_skillId_key" ON "MonsterSkill"("monsterId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterDamageModifierTranslation_damageModifierId_localeCod_key" ON "MonsterDamageModifierTranslation"("damageModifierId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterConditionImmunity_monsterId_conditionId_key" ON "MonsterConditionImmunity"("monsterId", "conditionId");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterLanguage_monsterId_languageId_key" ON "MonsterLanguage"("monsterId", "languageId");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterActionTranslation_actionId_localeCode_key" ON "MonsterActionTranslation"("actionId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterSpellcasting_actionId_key" ON "MonsterSpellcasting"("actionId");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterSpell_spellcastingId_spellId_key" ON "MonsterSpell"("spellcastingId", "spellId");

-- CreateIndex
CREATE UNIQUE INDEX "MonsterForm_monsterId_formMonsterId_key" ON "MonsterForm"("monsterId", "formMonsterId");

-- CreateIndex
CREATE INDEX "MagicItem_editionId_rarity_idx" ON "MagicItem"("editionId", "rarity");

-- CreateIndex
CREATE UNIQUE INDEX "MagicItem_editionId_index_key" ON "MagicItem"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "MagicItemTranslation_magicItemId_localeCode_key" ON "MagicItemTranslation"("magicItemId", "localeCode");

-- AddForeignKey
ALTER TABLE "CreatureSubtypeTranslation" ADD CONSTRAINT "CreatureSubtypeTranslation_creatureSubtypeId_fkey" FOREIGN KEY ("creatureSubtypeId") REFERENCES "CreatureSubtype"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatureSubtypeTranslation" ADD CONSTRAINT "CreatureSubtypeTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monster" ADD CONSTRAINT "Monster_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monster" ADD CONSTRAINT "Monster_creatureTypeId_fkey" FOREIGN KEY ("creatureTypeId") REFERENCES "CreatureType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Monster" ADD CONSTRAINT "Monster_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterTranslation" ADD CONSTRAINT "MonsterTranslation_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterTranslation" ADD CONSTRAINT "MonsterTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterSubtype" ADD CONSTRAINT "MonsterSubtype_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterSubtype" ADD CONSTRAINT "MonsterSubtype_creatureSubtypeId_fkey" FOREIGN KEY ("creatureSubtypeId") REFERENCES "CreatureSubtype"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterAlignment" ADD CONSTRAINT "MonsterAlignment_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterAlignment" ADD CONSTRAINT "MonsterAlignment_alignmentId_fkey" FOREIGN KEY ("alignmentId") REFERENCES "Alignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterArmorClass" ADD CONSTRAINT "MonsterArmorClass_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterArmorClass" ADD CONSTRAINT "MonsterArmorClass_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterArmorClass" ADD CONSTRAINT "MonsterArmorClass_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterArmorClassTranslation" ADD CONSTRAINT "MonsterArmorClassTranslation_armorClassId_fkey" FOREIGN KEY ("armorClassId") REFERENCES "MonsterArmorClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterArmorClassTranslation" ADD CONSTRAINT "MonsterArmorClassTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterArmorClassEquipment" ADD CONSTRAINT "MonsterArmorClassEquipment_armorClassId_fkey" FOREIGN KEY ("armorClassId") REFERENCES "MonsterArmorClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterArmorClassEquipment" ADD CONSTRAINT "MonsterArmorClassEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterSavingThrow" ADD CONSTRAINT "MonsterSavingThrow_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterSavingThrow" ADD CONSTRAINT "MonsterSavingThrow_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterSkill" ADD CONSTRAINT "MonsterSkill_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterSkill" ADD CONSTRAINT "MonsterSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterDamageModifier" ADD CONSTRAINT "MonsterDamageModifier_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterDamageModifier" ADD CONSTRAINT "MonsterDamageModifier_damageTypeId_fkey" FOREIGN KEY ("damageTypeId") REFERENCES "DamageType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterDamageModifierTranslation" ADD CONSTRAINT "MonsterDamageModifierTranslation_damageModifierId_fkey" FOREIGN KEY ("damageModifierId") REFERENCES "MonsterDamageModifier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterDamageModifierTranslation" ADD CONSTRAINT "MonsterDamageModifierTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterConditionImmunity" ADD CONSTRAINT "MonsterConditionImmunity_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterConditionImmunity" ADD CONSTRAINT "MonsterConditionImmunity_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterLanguage" ADD CONSTRAINT "MonsterLanguage_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterLanguage" ADD CONSTRAINT "MonsterLanguage_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterAction" ADD CONSTRAINT "MonsterAction_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterAction" ADD CONSTRAINT "MonsterAction_saveAbilityId_fkey" FOREIGN KEY ("saveAbilityId") REFERENCES "AbilityScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterActionTranslation" ADD CONSTRAINT "MonsterActionTranslation_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "MonsterAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterActionTranslation" ADD CONSTRAINT "MonsterActionTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterActionDamage" ADD CONSTRAINT "MonsterActionDamage_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "MonsterAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterActionDamage" ADD CONSTRAINT "MonsterActionDamage_damageTypeId_fkey" FOREIGN KEY ("damageTypeId") REFERENCES "DamageType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterMultiattackStep" ADD CONSTRAINT "MonsterMultiattackStep_multiattackId_fkey" FOREIGN KEY ("multiattackId") REFERENCES "MonsterAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterMultiattackStep" ADD CONSTRAINT "MonsterMultiattackStep_targetActionId_fkey" FOREIGN KEY ("targetActionId") REFERENCES "MonsterAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterSpellcasting" ADD CONSTRAINT "MonsterSpellcasting_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterSpellcasting" ADD CONSTRAINT "MonsterSpellcasting_actionId_fkey" FOREIGN KEY ("actionId") REFERENCES "MonsterAction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterSpellcasting" ADD CONSTRAINT "MonsterSpellcasting_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterSpellcasting" ADD CONSTRAINT "MonsterSpellcasting_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterSpell" ADD CONSTRAINT "MonsterSpell_spellcastingId_fkey" FOREIGN KEY ("spellcastingId") REFERENCES "MonsterSpellcasting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterSpell" ADD CONSTRAINT "MonsterSpell_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterForm" ADD CONSTRAINT "MonsterForm_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonsterForm" ADD CONSTRAINT "MonsterForm_formMonsterId_fkey" FOREIGN KEY ("formMonsterId") REFERENCES "Monster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicItem" ADD CONSTRAINT "MagicItem_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicItem" ADD CONSTRAINT "MagicItem_equipmentCategoryId_fkey" FOREIGN KEY ("equipmentCategoryId") REFERENCES "EquipmentCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicItem" ADD CONSTRAINT "MagicItem_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "MagicItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicItem" ADD CONSTRAINT "MagicItem_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicItemTranslation" ADD CONSTRAINT "MagicItemTranslation_magicItemId_fkey" FOREIGN KEY ("magicItemId") REFERENCES "MagicItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicItemTranslation" ADD CONSTRAINT "MagicItemTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;


-- Contraintes CHECK (ajoutées à la main, voir docs/modelisation/conventions.md)
ALTER TABLE "Monster" ADD CONSTRAINT "Monster_stats"
  CHECK ("strength" BETWEEN 1 AND 30 AND "dexterity" BETWEEN 1 AND 30 AND "constitution" BETWEEN 1 AND 30
    AND "intelligence" BETWEEN 1 AND 30 AND "wisdom" BETWEEN 1 AND 30 AND "charisma" BETWEEN 1 AND 30
    AND "hitPoints" > 0 AND "hitDiceCount" > 0 AND "hitDieSize" IN (4, 6, 8, 10, 12, 20)
    AND "challengeRating" >= 0 AND "xp" >= 0);

-- Un sort (armure de mage) ou un état (à terre) seulement pour la source correspondante
ALTER TABLE "MonsterArmorClass" ADD CONSTRAINT "MonsterArmorClass_source_target"
  CHECK (("spellId" IS NULL OR "sourceType" = 'SPELL') AND ("conditionId" IS NULL OR "sourceType" = 'CONDITION'));

ALTER TABLE "MonsterAction" ADD CONSTRAINT "MonsterAction_save"
  CHECK (("saveDc" IS NULL) = ("saveAbilityId" IS NULL)
    AND ("legendaryCost" IS NULL OR ("kind" = 'LEGENDARY' AND "legendaryCost" BETWEEN 1 AND 3)));

ALTER TABLE "MonsterMultiattackStep" ADD CONSTRAINT "MonsterMultiattackStep_count"
  CHECK ("count" >= 1);
