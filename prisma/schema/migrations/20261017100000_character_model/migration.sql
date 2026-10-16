-- Personnage relationnel : l'ancien personnage (copies du SRD dans une colonne
-- JSON) est remplacé. Les personnages existants étaient des essais : supprimés.
DELETE FROM "Character";

-- CreateEnum
CREATE TYPE "AbilityGenerationMethod" AS ENUM ('STANDARD_ARRAY', 'POINT_BUY', 'ROLLED', 'MANUAL');

-- DropForeignKey
ALTER TABLE "Character" DROP CONSTRAINT "Character_userId_fkey";

-- AlterTable
ALTER TABLE "Character" DROP COLUMN "class",
DROP COLUMN "data",
DROP COLUMN "level",
DROP COLUMN "race",
ADD COLUMN     "abilityMethod" "AbilityGenerationMethod" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "alignmentId" INTEGER,
ADD COLUMN     "appearance" TEXT,
ADD COLUMN     "backgroundId" INTEGER,
ADD COLUMN     "backstory" TEXT,
ADD COLUMN     "currentHitPoints" INTEGER,
ADD COLUMN     "deathSaveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "deathSaveSuccesses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "editionId" INTEGER NOT NULL,
ADD COLUMN     "experiencePoints" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "inspiration" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "portraitUrl" TEXT,
ADD COLUMN     "raceId" INTEGER NOT NULL,
ADD COLUMN     "subraceId" INTEGER,
ADD COLUMN     "temporaryHitPoints" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Choice" ADD COLUMN     "position" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CharacterAbilityScore" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "CharacterAbilityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterClass" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "subclassId" INTEGER,
    "position" INTEGER NOT NULL,
    "hitDiceUsed" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CharacterClass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterLevel" (
    "id" SERIAL NOT NULL,
    "characterClassId" INTEGER NOT NULL,
    "classLevel" INTEGER NOT NULL,
    "characterLevel" INTEGER NOT NULL,
    "hitPointRoll" INTEGER,
    "featId" INTEGER,

    CONSTRAINT "CharacterLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterAbilityIncrease" (
    "id" SERIAL NOT NULL,
    "characterLevelId" INTEGER NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,
    "bonus" INTEGER NOT NULL,

    CONSTRAINT "CharacterAbilityIncrease_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterChoice" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "choiceId" INTEGER NOT NULL,
    "optionId" INTEGER,
    "languageId" INTEGER,
    "equipmentId" INTEGER,
    "characterLevelId" INTEGER,

    CONSTRAINT "CharacterChoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSpell" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "characterClassId" INTEGER NOT NULL,
    "spellId" INTEGER NOT NULL,
    "prepared" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CharacterSpell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterSpellSlotUsage" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "spellLevel" INTEGER NOT NULL,
    "pact" BOOLEAN NOT NULL DEFAULT false,
    "used" INTEGER NOT NULL,

    CONSTRAINT "CharacterSpellSlotUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterFeatureUsage" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "classFeatureId" INTEGER,
    "traitId" INTEGER,
    "used" INTEGER NOT NULL,

    CONSTRAINT "CharacterFeatureUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterItem" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "equipmentId" INTEGER,
    "name" TEXT,
    "description" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "attuned" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CharacterItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterCurrency" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "currency" "Currency" NOT NULL,
    "amount" INTEGER NOT NULL,

    CONSTRAINT "CharacterCurrency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterPersonality" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "kind" "PersonalityKind" NOT NULL,
    "optionId" INTEGER,
    "customText" TEXT,

    CONSTRAINT "CharacterPersonality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterCondition" (
    "id" SERIAL NOT NULL,
    "characterId" INTEGER NOT NULL,
    "conditionId" INTEGER NOT NULL,

    CONSTRAINT "CharacterCondition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CharacterAbilityScore_characterId_abilityScoreId_key" ON "CharacterAbilityScore"("characterId", "abilityScoreId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterClass_characterId_classId_key" ON "CharacterClass"("characterId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterLevel_characterClassId_classLevel_key" ON "CharacterLevel"("characterClassId", "classLevel");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterAbilityIncrease_characterLevelId_abilityScoreId_key" ON "CharacterAbilityIncrease"("characterLevelId", "abilityScoreId");

-- CreateIndex
CREATE INDEX "CharacterChoice_characterId_idx" ON "CharacterChoice"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSpell_characterClassId_spellId_key" ON "CharacterSpell"("characterClassId", "spellId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterSpellSlotUsage_characterId_spellLevel_pact_key" ON "CharacterSpellSlotUsage"("characterId", "spellLevel", "pact");

-- CreateIndex
CREATE INDEX "CharacterItem_characterId_idx" ON "CharacterItem"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterCurrency_characterId_currency_key" ON "CharacterCurrency"("characterId", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "CharacterCondition_characterId_conditionId_key" ON "CharacterCondition"("characterId", "conditionId");

-- CreateIndex
CREATE UNIQUE INDEX "BackgroundPersonalityOption_backgroundId_kind_position_key" ON "BackgroundPersonalityOption"("backgroundId", "kind", "position");

-- CreateIndex
CREATE INDEX "Character_userId_idx" ON "Character"("userId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_subraceId_fkey" FOREIGN KEY ("subraceId") REFERENCES "Subrace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_backgroundId_fkey" FOREIGN KEY ("backgroundId") REFERENCES "Background"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_alignmentId_fkey" FOREIGN KEY ("alignmentId") REFERENCES "Alignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAbilityScore" ADD CONSTRAINT "CharacterAbilityScore_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAbilityScore" ADD CONSTRAINT "CharacterAbilityScore_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterClass" ADD CONSTRAINT "CharacterClass_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterClass" ADD CONSTRAINT "CharacterClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterClass" ADD CONSTRAINT "CharacterClass_subclassId_fkey" FOREIGN KEY ("subclassId") REFERENCES "Subclass"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterLevel" ADD CONSTRAINT "CharacterLevel_characterClassId_fkey" FOREIGN KEY ("characterClassId") REFERENCES "CharacterClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterLevel" ADD CONSTRAINT "CharacterLevel_featId_fkey" FOREIGN KEY ("featId") REFERENCES "Feat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAbilityIncrease" ADD CONSTRAINT "CharacterAbilityIncrease_characterLevelId_fkey" FOREIGN KEY ("characterLevelId") REFERENCES "CharacterLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterAbilityIncrease" ADD CONSTRAINT "CharacterAbilityIncrease_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterChoice" ADD CONSTRAINT "CharacterChoice_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterChoice" ADD CONSTRAINT "CharacterChoice_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "Choice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterChoice" ADD CONSTRAINT "CharacterChoice_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ChoiceOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterChoice" ADD CONSTRAINT "CharacterChoice_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterChoice" ADD CONSTRAINT "CharacterChoice_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterChoice" ADD CONSTRAINT "CharacterChoice_characterLevelId_fkey" FOREIGN KEY ("characterLevelId") REFERENCES "CharacterLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSpell" ADD CONSTRAINT "CharacterSpell_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSpell" ADD CONSTRAINT "CharacterSpell_characterClassId_fkey" FOREIGN KEY ("characterClassId") REFERENCES "CharacterClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSpell" ADD CONSTRAINT "CharacterSpell_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterSpellSlotUsage" ADD CONSTRAINT "CharacterSpellSlotUsage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterFeatureUsage" ADD CONSTRAINT "CharacterFeatureUsage_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterFeatureUsage" ADD CONSTRAINT "CharacterFeatureUsage_classFeatureId_fkey" FOREIGN KEY ("classFeatureId") REFERENCES "ClassFeature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterFeatureUsage" ADD CONSTRAINT "CharacterFeatureUsage_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "Trait"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterItem" ADD CONSTRAINT "CharacterItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterItem" ADD CONSTRAINT "CharacterItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterCurrency" ADD CONSTRAINT "CharacterCurrency_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterPersonality" ADD CONSTRAINT "CharacterPersonality_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterPersonality" ADD CONSTRAINT "CharacterPersonality_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "BackgroundPersonalityOption"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterCondition" ADD CONSTRAINT "CharacterCondition_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterCondition" ADD CONSTRAINT "CharacterCondition_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================================
-- Contraintes CHECK (ajoutées à la main, voir docs/modelisation/conventions.md)
-- ============================================================================

ALTER TABLE "Character" ADD CONSTRAINT "Character_play_state"
  CHECK ("experiencePoints" >= 0 AND "temporaryHitPoints" >= 0
         AND "deathSaveSuccesses" BETWEEN 0 AND 3 AND "deathSaveFailures" BETWEEN 0 AND 3);

ALTER TABLE "CharacterAbilityScore" ADD CONSTRAINT "CharacterAbilityScore_score_range"
  CHECK ("score" BETWEEN 1 AND 30);

ALTER TABLE "CharacterClass" ADD CONSTRAINT "CharacterClass_hit_dice_used"
  CHECK ("hitDiceUsed" >= 0 AND "position" >= 0);

ALTER TABLE "CharacterLevel" ADD CONSTRAINT "CharacterLevel_ranges"
  CHECK ("classLevel" BETWEEN 1 AND 20 AND "characterLevel" BETWEEN 1 AND 20
         AND ("hitPointRoll" IS NULL OR "hitPointRoll" >= 1));

ALTER TABLE "CharacterAbilityIncrease" ADD CONSTRAINT "CharacterAbilityIncrease_bonus"
  CHECK ("bonus" IN (1, 2));

-- Une réponse à un choix : une option listée, ou une langue / un objet de la réserve
ALTER TABLE "CharacterChoice" ADD CONSTRAINT "CharacterChoice_single_target"
  CHECK (num_nonnulls("optionId", "languageId", "equipmentId") = 1);

ALTER TABLE "CharacterSpellSlotUsage" ADD CONSTRAINT "CharacterSpellSlotUsage_ranges"
  CHECK ("spellLevel" BETWEEN 1 AND 9 AND "used" >= 0);

ALTER TABLE "CharacterFeatureUsage" ADD CONSTRAINT "CharacterFeatureUsage_single_target"
  CHECK (num_nonnulls("classFeatureId", "traitId") = 1 AND "used" >= 0);

-- Objet du catalogue ou objet libre nommé
ALTER TABLE "CharacterItem" ADD CONSTRAINT "CharacterItem_catalog_or_named"
  CHECK (num_nonnulls("equipmentId", "name") >= 1 AND "quantity" >= 0);

ALTER TABLE "CharacterCurrency" ADD CONSTRAINT "CharacterCurrency_amount"
  CHECK ("amount" >= 0);

-- Entrée de la table de l'historique ou texte du joueur
ALTER TABLE "CharacterPersonality" ADD CONSTRAINT "CharacterPersonality_option_or_text"
  CHECK (num_nonnulls("optionId", "customText") = 1);
