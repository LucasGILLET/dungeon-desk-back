-- Contenus de présentation (accroches, icônes, difficulté, caractéristiques
-- recommandées), règles de création de l'édition, PNJ relationnels et tables
-- du générateur de PNJ.

-- CreateEnum
CREATE TYPE "ClassDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "NpcGender" AS ENUM ('MALE', 'FEMALE', 'NON_BINARY');

-- CreateEnum
CREATE TYPE "NpcTableKind" AS ENUM ('FIRST_NAME', 'LAST_NAME', 'NAME_PREFIX', 'NAME_SUFFIX', 'BODY_TYPE', 'SOCIAL_STATUS', 'PROFESSION', 'RELATION', 'PERSONALITY', 'MOTIVATION', 'QUIRK', 'ORIGIN', 'HISTORY_EVENT');

-- DropForeignKey
ALTER TABLE "Npc" DROP CONSTRAINT "Npc_userId_fkey";

-- AlterTable
ALTER TABLE "AbilityScoreTranslation" ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "Background" ADD COLUMN     "icon" TEXT;

-- AlterTable
ALTER TABLE "BackgroundTranslation" ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "difficulty" "ClassDifficulty" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "ClassTranslation" ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "Edition" ADD COLUMN     "pointBuyBudget" INTEGER NOT NULL DEFAULT 27,
ADD COLUMN     "pointBuyCosts" JSONB NOT NULL DEFAULT '{"8":0,"9":1,"10":2,"11":3,"12":4,"13":5,"14":7,"15":9}',
ADD COLUMN     "standardArray" JSONB NOT NULL DEFAULT '[15,14,13,12,10,8]';


-- AlterTable
ALTER TABLE "Race" ADD COLUMN     "baseHeightCm" INTEGER,
ADD COLUMN     "baseWeightKg" INTEGER,
ADD COLUMN     "heightVarianceCm" INTEGER,
ADD COLUMN     "icon" TEXT,
ADD COLUMN     "npcFrequency" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "weightVarianceKg" INTEGER;

-- AlterTable
ALTER TABLE "RaceTranslation" ADD COLUMN     "summary" TEXT;

-- AlterTable
ALTER TABLE "Subclass" ADD COLUMN     "icon" TEXT;

-- CreateTable
CREATE TABLE "ClassRecommendedAbility" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ClassRecommendedAbility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpcAbilityScore" (
    "id" SERIAL NOT NULL,
    "npcId" INTEGER NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,

    CONSTRAINT "NpcAbilityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpcTableEntry" (
    "id" SERIAL NOT NULL,
    "kind" "NpcTableKind" NOT NULL,
    "raceId" INTEGER,
    "value" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "NpcTableEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NpcTableEntryTranslation" (
    "id" SERIAL NOT NULL,
    "entryId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "NpcTableEntryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassRecommendedAbility_classId_abilityScoreId_key" ON "ClassRecommendedAbility"("classId", "abilityScoreId");

-- CreateIndex
CREATE UNIQUE INDEX "NpcAbilityScore_npcId_abilityScoreId_key" ON "NpcAbilityScore"("npcId", "abilityScoreId");

-- CreateIndex
CREATE INDEX "NpcTableEntry_kind_raceId_idx" ON "NpcTableEntry"("kind", "raceId");

-- CreateIndex
CREATE UNIQUE INDEX "NpcTableEntryTranslation_entryId_localeCode_key" ON "NpcTableEntryTranslation"("entryId", "localeCode");


-- AddForeignKey
ALTER TABLE "ClassRecommendedAbility" ADD CONSTRAINT "ClassRecommendedAbility_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassRecommendedAbility" ADD CONSTRAINT "ClassRecommendedAbility_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Npc" ADD CONSTRAINT "Npc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;






-- AddForeignKey
ALTER TABLE "NpcAbilityScore" ADD CONSTRAINT "NpcAbilityScore_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "Npc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpcAbilityScore" ADD CONSTRAINT "NpcAbilityScore_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpcTableEntry" ADD CONSTRAINT "NpcTableEntry_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpcTableEntryTranslation" ADD CONSTRAINT "NpcTableEntryTranslation_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "NpcTableEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NpcTableEntryTranslation" ADD CONSTRAINT "NpcTableEntryTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- PNJ : conversion des PNJ existants (copies du SRD en JSON) vers les colonnes
-- ============================================================================

ALTER TABLE "Npc"
ADD COLUMN "editionId" INTEGER,
ADD COLUMN "firstName" TEXT,
ADD COLUMN "lastName" TEXT,
ADD COLUMN "raceId" INTEGER,
ADD COLUMN "subraceId" INTEGER,
ADD COLUMN "classId" INTEGER,
ADD COLUMN "alignmentId" INTEGER,
ADD COLUMN "gender" "NpcGender",
ADD COLUMN "age" INTEGER,
ADD COLUMN "heightCm" INTEGER,
ADD COLUMN "weightKg" INTEGER,
ADD COLUMN "bodyType" TEXT,
ADD COLUMN "profession" TEXT,
ADD COLUMN "socialStatus" TEXT,
ADD COLUMN "relations" TEXT,
ADD COLUMN "personality" TEXT,
ADD COLUMN "motivation" TEXT,
ADD COLUMN "quirk" TEXT,
ADD COLUMN "history" TEXT,
ADD COLUMN "notes" TEXT;

UPDATE "Npc" n SET
  "editionId" = (SELECT id FROM "Edition" WHERE code = '2014'),
  "firstName" = n.data->>'firstName',
  "lastName" = NULLIF(n.data->>'lastName', ''),
  "raceId" = COALESCE(
    (SELECT r.id FROM "Race" r JOIN "Edition" e ON e.id = r."editionId" AND e.code = '2014' WHERE r.index = n.data->'race'->>'index'),
    (SELECT r.id FROM "Race" r JOIN "Edition" e ON e.id = r."editionId" AND e.code = '2014' WHERE r.index = 'human')),
  "classId" = (SELECT c.id FROM "Class" c JOIN "Edition" e ON e.id = c."editionId" AND e.code = '2014' WHERE c.index = n.data->'class'->>'index'),
  "alignmentId" = (SELECT t."alignmentId" FROM "AlignmentTranslation" t
    WHERE t."localeCode" = 'fr' AND lower(regexp_replace(t.name, '\s*\(.*\)$', '')) = lower(n.data->>'alignment') LIMIT 1),
  "gender" = CASE n.data->>'gender' WHEN 'Homme' THEN 'MALE'::"NpcGender" WHEN 'Femme' THEN 'FEMALE'::"NpcGender" WHEN 'Non-binaire' THEN 'NON_BINARY'::"NpcGender" END,
  "age" = CASE WHEN n.data->>'age' ~ '^\d+$' THEN (n.data->>'age')::int END,
  "heightCm" = NULLIF(substring(n.data->>'height' FROM '(\d+)'), '')::int,
  "weightKg" = NULLIF(substring(n.data->>'weight' FROM '(\d+)'), '')::int,
  "bodyType" = n.data->>'bodyType',
  "profession" = n.data->>'profession',
  "socialStatus" = n.data->>'socialStatus',
  "relations" = n.data->>'relations',
  "personality" = n.data->>'personality',
  "motivation" = n.data->>'motivation',
  "quirk" = n.data->>'quirk',
  "history" = n.data->>'history';

-- Caractéristiques : { "FOR": 11, "DEX": 10, … } → une ligne par caractéristique
INSERT INTO "NpcAbilityScore" ("npcId", "abilityScoreId", "score")
SELECT n.id, a.id, (s.value)::int
FROM "Npc" n
CROSS JOIN LATERAL jsonb_each_text(COALESCE(n.data->'stats', '{}'::jsonb)) s
JOIN "AbilityScore" a ON a.index = CASE s.key WHEN 'FOR' THEN 'str' WHEN 'DEX' THEN 'dex' WHEN 'CON' THEN 'con' WHEN 'INT' THEN 'int' WHEN 'SAG' THEN 'wis' WHEN 'CHA' THEN 'cha' END
WHERE s.value ~ '^\d+$';

ALTER TABLE "Npc" ALTER COLUMN "editionId" SET NOT NULL, ALTER COLUMN "raceId" SET NOT NULL;
ALTER TABLE "Npc" DROP COLUMN "race", DROP COLUMN "class", DROP COLUMN "data";

-- CreateIndex
CREATE INDEX "Npc_userId_idx" ON "Npc"("userId");

-- AddForeignKey
ALTER TABLE "Npc" ADD CONSTRAINT "Npc_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Npc" ADD CONSTRAINT "Npc_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Npc" ADD CONSTRAINT "Npc_subraceId_fkey" FOREIGN KEY ("subraceId") REFERENCES "Subrace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Npc" ADD CONSTRAINT "Npc_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Npc" ADD CONSTRAINT "Npc_alignmentId_fkey" FOREIGN KEY ("alignmentId") REFERENCES "Alignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Contraintes CHECK (ajoutées à la main, voir docs/modelisation/conventions.md)
-- ============================================================================

ALTER TABLE "NpcAbilityScore" ADD CONSTRAINT "NpcAbilityScore_score_range" CHECK ("score" BETWEEN 1 AND 30);

-- Entrée du générateur : un nom propre (value) ou un texte traduit, et un poids positif
ALTER TABLE "NpcTableEntry" ADD CONSTRAINT "NpcTableEntry_weight" CHECK ("weight" > 0);

ALTER TABLE "Edition" ADD CONSTRAINT "Edition_point_buy_budget" CHECK ("pointBuyBudget" > 0);
