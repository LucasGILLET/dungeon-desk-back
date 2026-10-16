-- CreateEnum
CREATE TYPE "PersonalityKind" AS ENUM ('PERSONALITY_TRAIT', 'IDEAL', 'BOND', 'FLAW');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ChoiceKind" ADD VALUE 'LANGUAGE';
ALTER TYPE "ChoiceKind" ADD VALUE 'ABILITY_SCORE_INCREASE';
ALTER TYPE "ChoiceKind" ADD VALUE 'SPELL';

-- AlterEnum
ALTER TYPE "ChoicePool" ADD VALUE 'ANY_LANGUAGE';

-- AlterTable
ALTER TABLE "Choice" ADD COLUMN     "backgroundId" INTEGER,
ADD COLUMN     "raceId" INTEGER,
ADD COLUMN     "subraceId" INTEGER,
ADD COLUMN     "traitId" INTEGER;

-- AlterTable
ALTER TABLE "ChoiceOptionItem" ADD COLUMN     "abilityScoreId" INTEGER,
ADD COLUMN     "bonus" INTEGER,
ADD COLUMN     "currency" "Currency",
ADD COLUMN     "currencyAmount" INTEGER,
ADD COLUMN     "languageId" INTEGER,
ADD COLUMN     "spellId" INTEGER,
ADD COLUMN     "traitId" INTEGER;

-- CreateTable
CREATE TABLE "Race" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "sizes" "Size"[],
    "speeds" JSONB NOT NULL,
    "source" "ContentSource" NOT NULL DEFAULT 'SRD',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Race_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceTranslation" (
    "id" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ageText" TEXT,
    "alignmentText" TEXT,
    "sizeText" TEXT,
    "languageText" TEXT,

    CONSTRAINT "RaceTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceAbilityBonus" (
    "id" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL,

    CONSTRAINT "RaceAbilityBonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceLanguage" (
    "id" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "languageId" INTEGER NOT NULL,

    CONSTRAINT "RaceLanguage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RaceTrait" (
    "id" SERIAL NOT NULL,
    "raceId" INTEGER NOT NULL,
    "traitId" INTEGER NOT NULL,

    CONSTRAINT "RaceTrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subrace" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "raceId" INTEGER NOT NULL,
    "source" "ContentSource" NOT NULL DEFAULT 'SRD',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subrace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubraceTranslation" (
    "id" SERIAL NOT NULL,
    "subraceId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SubraceTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubraceAbilityBonus" (
    "id" SERIAL NOT NULL,
    "subraceId" INTEGER NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL,

    CONSTRAINT "SubraceAbilityBonus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubraceTrait" (
    "id" SERIAL NOT NULL,
    "subraceId" INTEGER NOT NULL,
    "traitId" INTEGER NOT NULL,

    CONSTRAINT "SubraceTrait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trait" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "parentId" INTEGER,
    "damageTypeId" INTEGER,
    "action" JSONB,
    "source" "ContentSource" NOT NULL DEFAULT 'SRD',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trait_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraitTranslation" (
    "id" SERIAL NOT NULL,
    "traitId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "TraitTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraitProficiency" (
    "id" SERIAL NOT NULL,
    "traitId" INTEGER NOT NULL,
    "proficiencyId" INTEGER NOT NULL,

    CONSTRAINT "TraitProficiency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Background" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "source" "ContentSource" NOT NULL DEFAULT 'SRD',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Background_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundTranslation" (
    "id" SERIAL NOT NULL,
    "backgroundId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "featureName" TEXT,
    "featureDescription" TEXT,

    CONSTRAINT "BackgroundTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundProficiency" (
    "id" SERIAL NOT NULL,
    "backgroundId" INTEGER NOT NULL,
    "proficiencyId" INTEGER NOT NULL,

    CONSTRAINT "BackgroundProficiency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundStartingEquipment" (
    "id" SERIAL NOT NULL,
    "backgroundId" INTEGER NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "BackgroundStartingEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackgroundPersonalityOption" (
    "id" SERIAL NOT NULL,
    "backgroundId" INTEGER NOT NULL,
    "kind" "PersonalityKind" NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "BackgroundPersonalityOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityOptionTranslation" (
    "id" SERIAL NOT NULL,
    "optionId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "PersonalityOptionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalityOptionAlignment" (
    "id" SERIAL NOT NULL,
    "optionId" INTEGER NOT NULL,
    "alignmentId" INTEGER NOT NULL,

    CONSTRAINT "PersonalityOptionAlignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feat" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "source" "ContentSource" NOT NULL DEFAULT 'SRD',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatTranslation" (
    "id" SERIAL NOT NULL,
    "featId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "FeatTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatPrerequisite" (
    "id" SERIAL NOT NULL,
    "featId" INTEGER NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,
    "minimumScore" INTEGER NOT NULL,
    "alternativeGroup" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "FeatPrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Race_editionId_index_key" ON "Race"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "RaceTranslation_raceId_localeCode_key" ON "RaceTranslation"("raceId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "RaceAbilityBonus_raceId_abilityScoreId_key" ON "RaceAbilityBonus"("raceId", "abilityScoreId");

-- CreateIndex
CREATE UNIQUE INDEX "RaceLanguage_raceId_languageId_key" ON "RaceLanguage"("raceId", "languageId");

-- CreateIndex
CREATE UNIQUE INDEX "RaceTrait_raceId_traitId_key" ON "RaceTrait"("raceId", "traitId");

-- CreateIndex
CREATE UNIQUE INDEX "Subrace_editionId_index_key" ON "Subrace"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "SubraceTranslation_subraceId_localeCode_key" ON "SubraceTranslation"("subraceId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "SubraceAbilityBonus_subraceId_abilityScoreId_key" ON "SubraceAbilityBonus"("subraceId", "abilityScoreId");

-- CreateIndex
CREATE UNIQUE INDEX "SubraceTrait_subraceId_traitId_key" ON "SubraceTrait"("subraceId", "traitId");

-- CreateIndex
CREATE UNIQUE INDEX "Trait_editionId_index_key" ON "Trait"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "TraitTranslation_traitId_localeCode_key" ON "TraitTranslation"("traitId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "TraitProficiency_traitId_proficiencyId_key" ON "TraitProficiency"("traitId", "proficiencyId");

-- CreateIndex
CREATE UNIQUE INDEX "Background_editionId_index_key" ON "Background"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundTranslation_backgroundId_localeCode_key" ON "BackgroundTranslation"("backgroundId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundProficiency_backgroundId_proficiencyId_key" ON "BackgroundProficiency"("backgroundId", "proficiencyId");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundStartingEquipment_backgroundId_equipmentId_key" ON "BackgroundStartingEquipment"("backgroundId", "equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalityOptionTranslation_optionId_localeCode_key" ON "PersonalityOptionTranslation"("optionId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "PersonalityOptionAlignment_optionId_alignmentId_key" ON "PersonalityOptionAlignment"("optionId", "alignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Feat_editionId_index_key" ON "Feat"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "FeatTranslation_featId_localeCode_key" ON "FeatTranslation"("featId", "localeCode");

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_subraceId_fkey" FOREIGN KEY ("subraceId") REFERENCES "Subrace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "Trait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_backgroundId_fkey" FOREIGN KEY ("backgroundId") REFERENCES "Background"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "Trait"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Race" ADD CONSTRAINT "Race_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceTranslation" ADD CONSTRAINT "RaceTranslation_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceTranslation" ADD CONSTRAINT "RaceTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceAbilityBonus" ADD CONSTRAINT "RaceAbilityBonus_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceAbilityBonus" ADD CONSTRAINT "RaceAbilityBonus_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceLanguage" ADD CONSTRAINT "RaceLanguage_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceLanguage" ADD CONSTRAINT "RaceLanguage_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceTrait" ADD CONSTRAINT "RaceTrait_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RaceTrait" ADD CONSTRAINT "RaceTrait_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "Trait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subrace" ADD CONSTRAINT "Subrace_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subrace" ADD CONSTRAINT "Subrace_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subrace" ADD CONSTRAINT "Subrace_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubraceTranslation" ADD CONSTRAINT "SubraceTranslation_subraceId_fkey" FOREIGN KEY ("subraceId") REFERENCES "Subrace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubraceTranslation" ADD CONSTRAINT "SubraceTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubraceAbilityBonus" ADD CONSTRAINT "SubraceAbilityBonus_subraceId_fkey" FOREIGN KEY ("subraceId") REFERENCES "Subrace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubraceAbilityBonus" ADD CONSTRAINT "SubraceAbilityBonus_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubraceTrait" ADD CONSTRAINT "SubraceTrait_subraceId_fkey" FOREIGN KEY ("subraceId") REFERENCES "Subrace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubraceTrait" ADD CONSTRAINT "SubraceTrait_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "Trait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trait" ADD CONSTRAINT "Trait_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trait" ADD CONSTRAINT "Trait_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Trait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trait" ADD CONSTRAINT "Trait_damageTypeId_fkey" FOREIGN KEY ("damageTypeId") REFERENCES "DamageType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Trait" ADD CONSTRAINT "Trait_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitTranslation" ADD CONSTRAINT "TraitTranslation_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "Trait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitTranslation" ADD CONSTRAINT "TraitTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitProficiency" ADD CONSTRAINT "TraitProficiency_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "Trait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitProficiency" ADD CONSTRAINT "TraitProficiency_proficiencyId_fkey" FOREIGN KEY ("proficiencyId") REFERENCES "Proficiency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Background" ADD CONSTRAINT "Background_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Background" ADD CONSTRAINT "Background_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundTranslation" ADD CONSTRAINT "BackgroundTranslation_backgroundId_fkey" FOREIGN KEY ("backgroundId") REFERENCES "Background"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundTranslation" ADD CONSTRAINT "BackgroundTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundProficiency" ADD CONSTRAINT "BackgroundProficiency_backgroundId_fkey" FOREIGN KEY ("backgroundId") REFERENCES "Background"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundProficiency" ADD CONSTRAINT "BackgroundProficiency_proficiencyId_fkey" FOREIGN KEY ("proficiencyId") REFERENCES "Proficiency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundStartingEquipment" ADD CONSTRAINT "BackgroundStartingEquipment_backgroundId_fkey" FOREIGN KEY ("backgroundId") REFERENCES "Background"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundStartingEquipment" ADD CONSTRAINT "BackgroundStartingEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BackgroundPersonalityOption" ADD CONSTRAINT "BackgroundPersonalityOption_backgroundId_fkey" FOREIGN KEY ("backgroundId") REFERENCES "Background"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityOptionTranslation" ADD CONSTRAINT "PersonalityOptionTranslation_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "BackgroundPersonalityOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityOptionTranslation" ADD CONSTRAINT "PersonalityOptionTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityOptionAlignment" ADD CONSTRAINT "PersonalityOptionAlignment_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "BackgroundPersonalityOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalityOptionAlignment" ADD CONSTRAINT "PersonalityOptionAlignment_alignmentId_fkey" FOREIGN KEY ("alignmentId") REFERENCES "Alignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feat" ADD CONSTRAINT "Feat_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feat" ADD CONSTRAINT "Feat_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatTranslation" ADD CONSTRAINT "FeatTranslation_featId_fkey" FOREIGN KEY ("featId") REFERENCES "Feat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatTranslation" ADD CONSTRAINT "FeatTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatPrerequisite" ADD CONSTRAINT "FeatPrerequisite_featId_fkey" FOREIGN KEY ("featId") REFERENCES "Feat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeatPrerequisite" ADD CONSTRAINT "FeatPrerequisite_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================================
-- Contraintes CHECK (ajoutées à la main, voir docs/modelisation/conventions.md)
-- ============================================================================

-- Un choix a exactement un propriétaire (nouveaux : race, sous-race, trait, historique)
ALTER TABLE "Choice" DROP CONSTRAINT "Choice_single_owner";
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_single_owner"
  CHECK (num_nonnulls("classId", "subclassId", "classFeatureId", "raceId", "subraceId",
                      "traitId", "backgroundId", "parentOptionId") = 1);

-- Un élément d'option donne exactement une chose, ou une somme d'argent
ALTER TABLE "ChoiceOptionItem" DROP CONSTRAINT "ChoiceOptionItem_single_target";
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_single_target"
  CHECK (num_nonnulls("proficiencyId", "equipmentId", "equipmentCategoryId", "classFeatureId",
                      "creatureTypeId", "terrainId", "languageId", "abilityScoreId", "spellId",
                      "traitId", "currencyAmount") = 1
         AND ("currencyAmount" IS NULL) = ("currency" IS NULL));

-- Un bonus ne s'applique qu'à une caractéristique
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_bonus_on_ability"
  CHECK ("bonus" IS NULL OR "abilityScoreId" IS NOT NULL);
