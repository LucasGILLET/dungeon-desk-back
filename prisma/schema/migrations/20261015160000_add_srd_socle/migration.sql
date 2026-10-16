-- CreateEnum
CREATE TYPE "ContentSource" AS ENUM ('SRD', 'HOMEBREW');

-- CreateEnum
CREATE TYPE "Size" AS ENUM ('TINY', 'SMALL', 'MEDIUM', 'LARGE', 'HUGE', 'GARGANTUAN');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('CP', 'SP', 'EP', 'GP', 'PP');

-- CreateEnum
CREATE TYPE "AlignmentEthic" AS ENUM ('LAWFUL', 'NEUTRAL', 'CHAOTIC');

-- CreateEnum
CREATE TYPE "AlignmentMorality" AS ENUM ('GOOD', 'NEUTRAL', 'EVIL');

-- CreateEnum
CREATE TYPE "LanguageRarity" AS ENUM ('STANDARD', 'EXOTIC', 'RARE', 'SECRET');

-- CreateEnum
CREATE TYPE "ProficiencyType" AS ENUM ('SKILL', 'SAVING_THROW', 'ARMOR', 'WEAPON', 'ARTISAN_TOOL', 'MUSICAL_INSTRUMENT', 'GAMING_SET', 'VEHICLE', 'OTHER');

-- CreateEnum
CREATE TYPE "EquipmentKind" AS ENUM ('WEAPON', 'ARMOR', 'ADVENTURING_GEAR', 'AMMUNITION', 'TOOL', 'MOUNT', 'VEHICLE', 'PACK', 'FOCUS');

-- CreateEnum
CREATE TYPE "WeaponCategory" AS ENUM ('SIMPLE', 'MARTIAL');

-- CreateEnum
CREATE TYPE "WeaponRange" AS ENUM ('MELEE', 'RANGED');

-- CreateEnum
CREATE TYPE "ArmorCategory" AS ENUM ('LIGHT', 'MEDIUM', 'HEAVY', 'SHIELD');

-- CreateEnum
CREATE TYPE "VehicleSpeedUnit" AS ENUM ('FEET_PER_ROUND', 'MILES_PER_HOUR');

-- CreateEnum
CREATE TYPE "ChoiceKind" AS ENUM ('PROFICIENCY', 'MULTICLASS_PROFICIENCY', 'EXPERTISE', 'STARTING_EQUIPMENT', 'SUBFEATURE', 'FAVORED_ENEMY', 'FAVORED_TERRAIN');

-- CreateEnum
CREATE TYPE "ChoicePool" AS ENUM ('EQUIPMENT_CATEGORY');

-- CreateEnum
CREATE TYPE "ClassColumnValueType" AS ENUM ('INTEGER', 'DICE', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "CasterType" AS ENUM ('FULL', 'HALF', 'THIRD', 'PACT');

-- CreateEnum
CREATE TYPE "ClassFeaturePrerequisiteType" AS ENUM ('LEVEL', 'FEATURE', 'SPELL');

-- CreateEnum
CREATE TYPE "CastingTimeUnit" AS ENUM ('ACTION', 'BONUS_ACTION', 'REACTION', 'MINUTE', 'HOUR');

-- CreateEnum
CREATE TYPE "SpellRangeType" AS ENUM ('SELF', 'TOUCH', 'DISTANCE', 'SIGHT', 'UNLIMITED', 'SPECIAL');

-- CreateEnum
CREATE TYPE "SpellDurationType" AS ENUM ('INSTANTANEOUS', 'ROUND', 'MINUTE', 'HOUR', 'DAY', 'UNTIL_DISPELLED', 'SPECIAL');

-- CreateEnum
CREATE TYPE "AttackType" AS ENUM ('MELEE', 'RANGED');

-- CreateEnum
CREATE TYPE "SaveSuccess" AS ENUM ('NONE', 'HALF', 'OTHER');

-- CreateEnum
CREATE TYPE "AreaType" AS ENUM ('CONE', 'CUBE', 'CYLINDER', 'LINE', 'SPHERE', 'EMANATION');

-- CreateTable
CREATE TABLE "Locale" (
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Locale_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "Edition" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "releaseYear" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,

    CONSTRAINT "Edition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EditionTranslation" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attribution" TEXT NOT NULL,

    CONSTRAINT "EditionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbilityScore" (
    "id" SERIAL NOT NULL,
    "index" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "AbilityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbilityScoreTranslation" (
    "id" SERIAL NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "AbilityScoreTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" SERIAL NOT NULL,
    "index" TEXT NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillTranslation" (
    "id" SERIAL NOT NULL,
    "skillId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SkillTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alignment" (
    "id" SERIAL NOT NULL,
    "index" TEXT NOT NULL,
    "ethic" "AlignmentEthic" NOT NULL,
    "morality" "AlignmentMorality" NOT NULL,

    CONSTRAINT "Alignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlignmentTranslation" (
    "id" SERIAL NOT NULL,
    "alignmentId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbreviation" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "AlignmentTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageType" (
    "id" SERIAL NOT NULL,
    "index" TEXT NOT NULL,

    CONSTRAINT "DamageType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DamageTypeTranslation" (
    "id" SERIAL NOT NULL,
    "damageTypeId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "DamageTypeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicSchool" (
    "id" SERIAL NOT NULL,
    "index" TEXT NOT NULL,

    CONSTRAINT "MagicSchool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MagicSchoolTranslation" (
    "id" SERIAL NOT NULL,
    "magicSchoolId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "MagicSchoolTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatureType" (
    "id" SERIAL NOT NULL,
    "index" TEXT NOT NULL,

    CONSTRAINT "CreatureType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatureTypeTranslation" (
    "id" SERIAL NOT NULL,
    "creatureTypeId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "pluralName" TEXT NOT NULL,

    CONSTRAINT "CreatureTypeTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Terrain" (
    "id" SERIAL NOT NULL,
    "index" TEXT NOT NULL,

    CONSTRAINT "Terrain_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TerrainTranslation" (
    "id" SERIAL NOT NULL,
    "terrainId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "TerrainTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Condition" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,

    CONSTRAINT "Condition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionTranslation" (
    "id" SERIAL NOT NULL,
    "conditionId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ConditionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Language" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "rarity" "LanguageRarity" NOT NULL,
    "scriptId" INTEGER,
    "source" "ContentSource" NOT NULL DEFAULT 'SRD',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Language_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageTranslation" (
    "id" SERIAL NOT NULL,
    "languageId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typicalSpeakers" TEXT,
    "description" TEXT,

    CONSTRAINT "LanguageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Proficiency" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "type" "ProficiencyType" NOT NULL,
    "skillId" INTEGER,
    "abilityScoreId" INTEGER,
    "equipmentId" INTEGER,
    "equipmentCategoryId" INTEGER,

    CONSTRAINT "Proficiency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProficiencyTranslation" (
    "id" SERIAL NOT NULL,
    "proficiencyId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "ProficiencyTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentCategory" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "parentId" INTEGER,

    CONSTRAINT "EquipmentCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentCategoryTranslation" (
    "id" SERIAL NOT NULL,
    "equipmentCategoryId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "EquipmentCategoryTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "kind" "EquipmentKind" NOT NULL,
    "costAmount" INTEGER,
    "costCurrency" "Currency",
    "weightLb" DECIMAL(8,2),
    "bundleSize" INTEGER NOT NULL DEFAULT 1,
    "imageUrl" TEXT,
    "source" "ContentSource" NOT NULL DEFAULT 'SRD',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentTranslation" (
    "id" SERIAL NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "EquipmentTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EquipmentCategoryItem" (
    "id" SERIAL NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "categoryId" INTEGER NOT NULL,

    CONSTRAINT "EquipmentCategoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackContent" (
    "id" SERIAL NOT NULL,
    "packId" INTEGER NOT NULL,
    "itemId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PackContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeaponStats" (
    "equipmentId" INTEGER NOT NULL,
    "category" "WeaponCategory" NOT NULL,
    "range" "WeaponRange" NOT NULL,
    "damageDice" TEXT,
    "damageTypeId" INTEGER,
    "versatileDice" TEXT,
    "normalRangeFt" INTEGER,
    "longRangeFt" INTEGER,

    CONSTRAINT "WeaponStats_pkey" PRIMARY KEY ("equipmentId")
);

-- CreateTable
CREATE TABLE "WeaponProperty" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,

    CONSTRAINT "WeaponProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeaponPropertyTranslation" (
    "id" SERIAL NOT NULL,
    "weaponPropertyId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "WeaponPropertyTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeaponStatsProperty" (
    "id" SERIAL NOT NULL,
    "weaponId" INTEGER NOT NULL,
    "propertyId" INTEGER NOT NULL,

    CONSTRAINT "WeaponStatsProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArmorStats" (
    "equipmentId" INTEGER NOT NULL,
    "category" "ArmorCategory" NOT NULL,
    "baseArmorClass" INTEGER NOT NULL,
    "addsDexModifier" BOOLEAN NOT NULL,
    "maxDexModifier" INTEGER,
    "strengthMinimum" INTEGER,
    "stealthDisadvantage" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ArmorStats_pkey" PRIMARY KEY ("equipmentId")
);

-- CreateTable
CREATE TABLE "VehicleStats" (
    "equipmentId" INTEGER NOT NULL,
    "speed" DECIMAL(6,1),
    "speedUnit" "VehicleSpeedUnit",
    "capacityLb" INTEGER,

    CONSTRAINT "VehicleStats_pkey" PRIMARY KEY ("equipmentId")
);

-- CreateTable
CREATE TABLE "Choice" (
    "id" SERIAL NOT NULL,
    "kind" "ChoiceKind" NOT NULL,
    "choose" INTEGER NOT NULL,
    "classId" INTEGER,
    "subclassId" INTEGER,
    "classFeatureId" INTEGER,
    "parentOptionId" INTEGER,
    "pool" "ChoicePool",
    "poolCategoryId" INTEGER,

    CONSTRAINT "Choice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoiceTranslation" (
    "id" SERIAL NOT NULL,
    "choiceId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ChoiceTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoiceOption" (
    "id" SERIAL NOT NULL,
    "choiceId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ChoiceOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChoiceOptionItem" (
    "id" SERIAL NOT NULL,
    "optionId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "proficiencyId" INTEGER,
    "equipmentId" INTEGER,
    "equipmentCategoryId" INTEGER,
    "classFeatureId" INTEGER,
    "creatureTypeId" INTEGER,
    "terrainId" INTEGER,

    CONSTRAINT "ChoiceOptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "hitDie" INTEGER NOT NULL,
    "subclassLevel" INTEGER NOT NULL,
    "source" "ContentSource" NOT NULL DEFAULT 'SRD',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassTranslation" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "subclassLabel" TEXT NOT NULL,

    CONSTRAINT "ClassTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassPrimaryAbility" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,

    CONSTRAINT "ClassPrimaryAbility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSavingThrow" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,

    CONSTRAINT "ClassSavingThrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassProficiency" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "proficiencyId" INTEGER NOT NULL,

    CONSTRAINT "ClassProficiency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassStartingEquipment" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "equipmentId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ClassStartingEquipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassLevel" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "level" INTEGER NOT NULL,
    "abilityScoreImprovements" INTEGER NOT NULL DEFAULT 0,
    "cantripsKnown" INTEGER,
    "spellsKnown" INTEGER,

    CONSTRAINT "ClassLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassLevelSpellSlot" (
    "id" SERIAL NOT NULL,
    "classLevelId" INTEGER NOT NULL,
    "spellLevel" INTEGER NOT NULL,
    "slots" INTEGER NOT NULL,

    CONSTRAINT "ClassLevelSpellSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassTableColumn" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "subclassId" INTEGER,
    "key" TEXT NOT NULL,
    "valueType" "ClassColumnValueType" NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ClassTableColumn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassTableColumnTranslation" (
    "id" SERIAL NOT NULL,
    "columnId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "ClassTableColumnTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassLevelValue" (
    "id" SERIAL NOT NULL,
    "classLevelId" INTEGER NOT NULL,
    "columnId" INTEGER NOT NULL,
    "intValue" INTEGER,
    "diceCount" INTEGER,
    "diceValue" INTEGER,
    "boolValue" BOOLEAN,

    CONSTRAINT "ClassLevelValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSpellcasting" (
    "classId" INTEGER NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,
    "startLevel" INTEGER NOT NULL,
    "casterType" "CasterType" NOT NULL,
    "ritualCasting" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ClassSpellcasting_pkey" PRIMARY KEY ("classId")
);

-- CreateTable
CREATE TABLE "SpellcastingSection" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "SpellcastingSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpellcastingSectionTranslation" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "SpellcastingSectionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassSpell" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "spellId" INTEGER NOT NULL,

    CONSTRAINT "ClassSpell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MulticlassRequirement" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "abilityScoreId" INTEGER NOT NULL,
    "minimumScore" INTEGER NOT NULL DEFAULT 13,
    "alternativeGroup" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "MulticlassRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassMulticlassProficiency" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "proficiencyId" INTEGER NOT NULL,

    CONSTRAINT "ClassMulticlassProficiency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subclass" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "casterType" "CasterType",
    "source" "ContentSource" NOT NULL DEFAULT 'SRD',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subclass_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubclassTranslation" (
    "id" SERIAL NOT NULL,
    "subclassId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "SubclassTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubclassSpell" (
    "id" SERIAL NOT NULL,
    "subclassId" INTEGER NOT NULL,
    "spellId" INTEGER NOT NULL,
    "requiredClassLevel" INTEGER NOT NULL,
    "requiredFeatureId" INTEGER,

    CONSTRAINT "SubclassSpell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassFeature" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "subclassId" INTEGER,
    "parentId" INTEGER,
    "source" "ContentSource" NOT NULL DEFAULT 'SRD',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassFeatureTranslation" (
    "id" SERIAL NOT NULL,
    "classFeatureId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "ClassFeatureTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassFeaturePrerequisite" (
    "id" SERIAL NOT NULL,
    "classFeatureId" INTEGER NOT NULL,
    "type" "ClassFeaturePrerequisiteType" NOT NULL,
    "minimumLevel" INTEGER,
    "requiredFeatureId" INTEGER,
    "requiredSpellId" INTEGER,

    CONSTRAINT "ClassFeaturePrerequisite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spell" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "castingTimeAmount" INTEGER NOT NULL DEFAULT 1,
    "castingTimeUnit" "CastingTimeUnit" NOT NULL,
    "ritual" BOOLEAN NOT NULL DEFAULT false,
    "rangeType" "SpellRangeType" NOT NULL,
    "rangeFt" INTEGER,
    "verbal" BOOLEAN NOT NULL DEFAULT false,
    "somatic" BOOLEAN NOT NULL DEFAULT false,
    "material" BOOLEAN NOT NULL DEFAULT false,
    "materialCostGp" DECIMAL(10,2),
    "materialConsumed" BOOLEAN NOT NULL DEFAULT false,
    "durationType" "SpellDurationType" NOT NULL,
    "durationAmount" INTEGER,
    "concentration" BOOLEAN NOT NULL DEFAULT false,
    "attackType" "AttackType",
    "saveAbilityId" INTEGER,
    "saveSuccess" "SaveSuccess",
    "areaType" "AreaType",
    "areaSizeFt" INTEGER,
    "damageScaling" JSONB,
    "healingScaling" JSONB,
    "source" "ContentSource" NOT NULL DEFAULT 'SRD',
    "ownerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Spell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpellTranslation" (
    "id" SERIAL NOT NULL,
    "spellId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "higherLevels" TEXT,
    "materialText" TEXT,
    "castingTimeNote" TEXT,
    "rangeNote" TEXT,

    CONSTRAINT "SpellTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpellDamageType" (
    "id" SERIAL NOT NULL,
    "spellId" INTEGER NOT NULL,
    "damageTypeId" INTEGER NOT NULL,

    CONSTRAINT "SpellDamageType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Edition_code_key" ON "Edition"("code");

-- CreateIndex
CREATE UNIQUE INDEX "EditionTranslation_editionId_localeCode_key" ON "EditionTranslation"("editionId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "AbilityScore_index_key" ON "AbilityScore"("index");

-- CreateIndex
CREATE UNIQUE INDEX "AbilityScoreTranslation_abilityScoreId_localeCode_key" ON "AbilityScoreTranslation"("abilityScoreId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_index_key" ON "Skill"("index");

-- CreateIndex
CREATE UNIQUE INDEX "SkillTranslation_skillId_localeCode_key" ON "SkillTranslation"("skillId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Alignment_index_key" ON "Alignment"("index");

-- CreateIndex
CREATE UNIQUE INDEX "AlignmentTranslation_alignmentId_localeCode_key" ON "AlignmentTranslation"("alignmentId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "DamageType_index_key" ON "DamageType"("index");

-- CreateIndex
CREATE UNIQUE INDEX "DamageTypeTranslation_damageTypeId_localeCode_key" ON "DamageTypeTranslation"("damageTypeId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "MagicSchool_index_key" ON "MagicSchool"("index");

-- CreateIndex
CREATE UNIQUE INDEX "MagicSchoolTranslation_magicSchoolId_localeCode_key" ON "MagicSchoolTranslation"("magicSchoolId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "CreatureType_index_key" ON "CreatureType"("index");

-- CreateIndex
CREATE UNIQUE INDEX "CreatureTypeTranslation_creatureTypeId_localeCode_key" ON "CreatureTypeTranslation"("creatureTypeId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Terrain_index_key" ON "Terrain"("index");

-- CreateIndex
CREATE UNIQUE INDEX "TerrainTranslation_terrainId_localeCode_key" ON "TerrainTranslation"("terrainId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Condition_editionId_index_key" ON "Condition"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "ConditionTranslation_conditionId_localeCode_key" ON "ConditionTranslation"("conditionId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Language_editionId_index_key" ON "Language"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageTranslation_languageId_localeCode_key" ON "LanguageTranslation"("languageId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Proficiency_editionId_index_key" ON "Proficiency"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "ProficiencyTranslation_proficiencyId_localeCode_key" ON "ProficiencyTranslation"("proficiencyId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentCategory_editionId_index_key" ON "EquipmentCategory"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentCategoryTranslation_equipmentCategoryId_localeCode_key" ON "EquipmentCategoryTranslation"("equipmentCategoryId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_editionId_index_key" ON "Equipment"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentTranslation_equipmentId_localeCode_key" ON "EquipmentTranslation"("equipmentId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentCategoryItem_equipmentId_categoryId_key" ON "EquipmentCategoryItem"("equipmentId", "categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "PackContent_packId_itemId_key" ON "PackContent"("packId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "WeaponProperty_editionId_index_key" ON "WeaponProperty"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "WeaponPropertyTranslation_weaponPropertyId_localeCode_key" ON "WeaponPropertyTranslation"("weaponPropertyId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "WeaponStatsProperty_weaponId_propertyId_key" ON "WeaponStatsProperty"("weaponId", "propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "Choice_parentOptionId_key" ON "Choice"("parentOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "ChoiceTranslation_choiceId_localeCode_key" ON "ChoiceTranslation"("choiceId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Class_editionId_index_key" ON "Class"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTranslation_classId_localeCode_key" ON "ClassTranslation"("classId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "ClassPrimaryAbility_classId_abilityScoreId_key" ON "ClassPrimaryAbility"("classId", "abilityScoreId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSavingThrow_classId_abilityScoreId_key" ON "ClassSavingThrow"("classId", "abilityScoreId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassProficiency_classId_proficiencyId_key" ON "ClassProficiency"("classId", "proficiencyId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassStartingEquipment_classId_equipmentId_key" ON "ClassStartingEquipment"("classId", "equipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassLevel_classId_level_key" ON "ClassLevel"("classId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "ClassLevelSpellSlot_classLevelId_spellLevel_key" ON "ClassLevelSpellSlot"("classLevelId", "spellLevel");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTableColumn_classId_key_key" ON "ClassTableColumn"("classId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "ClassTableColumnTranslation_columnId_localeCode_key" ON "ClassTableColumnTranslation"("columnId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "ClassLevelValue_classLevelId_columnId_key" ON "ClassLevelValue"("classLevelId", "columnId");

-- CreateIndex
CREATE UNIQUE INDEX "SpellcastingSectionTranslation_sectionId_localeCode_key" ON "SpellcastingSectionTranslation"("sectionId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "ClassSpell_classId_spellId_key" ON "ClassSpell"("classId", "spellId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassMulticlassProficiency_classId_proficiencyId_key" ON "ClassMulticlassProficiency"("classId", "proficiencyId");

-- CreateIndex
CREATE UNIQUE INDEX "Subclass_editionId_index_key" ON "Subclass"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "SubclassTranslation_subclassId_localeCode_key" ON "SubclassTranslation"("subclassId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "SubclassSpell_subclassId_spellId_requiredFeatureId_key" ON "SubclassSpell"("subclassId", "spellId", "requiredFeatureId");

-- CreateIndex
CREATE INDEX "ClassFeature_classId_level_idx" ON "ClassFeature"("classId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "ClassFeature_editionId_index_key" ON "ClassFeature"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "ClassFeatureTranslation_classFeatureId_localeCode_key" ON "ClassFeatureTranslation"("classFeatureId", "localeCode");

-- CreateIndex
CREATE INDEX "Spell_editionId_level_idx" ON "Spell"("editionId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "Spell_editionId_index_key" ON "Spell"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "SpellTranslation_spellId_localeCode_key" ON "SpellTranslation"("spellId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "SpellDamageType_spellId_damageTypeId_key" ON "SpellDamageType"("spellId", "damageTypeId");

-- AddForeignKey
ALTER TABLE "EditionTranslation" ADD CONSTRAINT "EditionTranslation_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EditionTranslation" ADD CONSTRAINT "EditionTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbilityScoreTranslation" ADD CONSTRAINT "AbilityScoreTranslation_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbilityScoreTranslation" ADD CONSTRAINT "AbilityScoreTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Skill" ADD CONSTRAINT "Skill_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillTranslation" ADD CONSTRAINT "SkillTranslation_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillTranslation" ADD CONSTRAINT "SkillTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlignmentTranslation" ADD CONSTRAINT "AlignmentTranslation_alignmentId_fkey" FOREIGN KEY ("alignmentId") REFERENCES "Alignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlignmentTranslation" ADD CONSTRAINT "AlignmentTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageTypeTranslation" ADD CONSTRAINT "DamageTypeTranslation_damageTypeId_fkey" FOREIGN KEY ("damageTypeId") REFERENCES "DamageType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DamageTypeTranslation" ADD CONSTRAINT "DamageTypeTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicSchoolTranslation" ADD CONSTRAINT "MagicSchoolTranslation_magicSchoolId_fkey" FOREIGN KEY ("magicSchoolId") REFERENCES "MagicSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MagicSchoolTranslation" ADD CONSTRAINT "MagicSchoolTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatureTypeTranslation" ADD CONSTRAINT "CreatureTypeTranslation_creatureTypeId_fkey" FOREIGN KEY ("creatureTypeId") REFERENCES "CreatureType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatureTypeTranslation" ADD CONSTRAINT "CreatureTypeTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerrainTranslation" ADD CONSTRAINT "TerrainTranslation_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "Terrain"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TerrainTranslation" ADD CONSTRAINT "TerrainTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Condition" ADD CONSTRAINT "Condition_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionTranslation" ADD CONSTRAINT "ConditionTranslation_conditionId_fkey" FOREIGN KEY ("conditionId") REFERENCES "Condition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionTranslation" ADD CONSTRAINT "ConditionTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Language" ADD CONSTRAINT "Language_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Language" ADD CONSTRAINT "Language_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "Language"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Language" ADD CONSTRAINT "Language_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageTranslation" ADD CONSTRAINT "LanguageTranslation_languageId_fkey" FOREIGN KEY ("languageId") REFERENCES "Language"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageTranslation" ADD CONSTRAINT "LanguageTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proficiency" ADD CONSTRAINT "Proficiency_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proficiency" ADD CONSTRAINT "Proficiency_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proficiency" ADD CONSTRAINT "Proficiency_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proficiency" ADD CONSTRAINT "Proficiency_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Proficiency" ADD CONSTRAINT "Proficiency_equipmentCategoryId_fkey" FOREIGN KEY ("equipmentCategoryId") REFERENCES "EquipmentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProficiencyTranslation" ADD CONSTRAINT "ProficiencyTranslation_proficiencyId_fkey" FOREIGN KEY ("proficiencyId") REFERENCES "Proficiency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProficiencyTranslation" ADD CONSTRAINT "ProficiencyTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentCategory" ADD CONSTRAINT "EquipmentCategory_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentCategory" ADD CONSTRAINT "EquipmentCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "EquipmentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentCategoryTranslation" ADD CONSTRAINT "EquipmentCategoryTranslation_equipmentCategoryId_fkey" FOREIGN KEY ("equipmentCategoryId") REFERENCES "EquipmentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentCategoryTranslation" ADD CONSTRAINT "EquipmentCategoryTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipment" ADD CONSTRAINT "Equipment_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentTranslation" ADD CONSTRAINT "EquipmentTranslation_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentTranslation" ADD CONSTRAINT "EquipmentTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentCategoryItem" ADD CONSTRAINT "EquipmentCategoryItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EquipmentCategoryItem" ADD CONSTRAINT "EquipmentCategoryItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "EquipmentCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackContent" ADD CONSTRAINT "PackContent_packId_fkey" FOREIGN KEY ("packId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackContent" ADD CONSTRAINT "PackContent_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeaponStats" ADD CONSTRAINT "WeaponStats_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeaponStats" ADD CONSTRAINT "WeaponStats_damageTypeId_fkey" FOREIGN KEY ("damageTypeId") REFERENCES "DamageType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeaponProperty" ADD CONSTRAINT "WeaponProperty_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeaponPropertyTranslation" ADD CONSTRAINT "WeaponPropertyTranslation_weaponPropertyId_fkey" FOREIGN KEY ("weaponPropertyId") REFERENCES "WeaponProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeaponPropertyTranslation" ADD CONSTRAINT "WeaponPropertyTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeaponStatsProperty" ADD CONSTRAINT "WeaponStatsProperty_weaponId_fkey" FOREIGN KEY ("weaponId") REFERENCES "WeaponStats"("equipmentId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeaponStatsProperty" ADD CONSTRAINT "WeaponStatsProperty_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "WeaponProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArmorStats" ADD CONSTRAINT "ArmorStats_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleStats" ADD CONSTRAINT "VehicleStats_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_subclassId_fkey" FOREIGN KEY ("subclassId") REFERENCES "Subclass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_classFeatureId_fkey" FOREIGN KEY ("classFeatureId") REFERENCES "ClassFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_parentOptionId_fkey" FOREIGN KEY ("parentOptionId") REFERENCES "ChoiceOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_poolCategoryId_fkey" FOREIGN KEY ("poolCategoryId") REFERENCES "EquipmentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceTranslation" ADD CONSTRAINT "ChoiceTranslation_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "Choice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceTranslation" ADD CONSTRAINT "ChoiceTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceOption" ADD CONSTRAINT "ChoiceOption_choiceId_fkey" FOREIGN KEY ("choiceId") REFERENCES "Choice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "ChoiceOption"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_proficiencyId_fkey" FOREIGN KEY ("proficiencyId") REFERENCES "Proficiency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_equipmentCategoryId_fkey" FOREIGN KEY ("equipmentCategoryId") REFERENCES "EquipmentCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_classFeatureId_fkey" FOREIGN KEY ("classFeatureId") REFERENCES "ClassFeature"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_creatureTypeId_fkey" FOREIGN KEY ("creatureTypeId") REFERENCES "CreatureType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_terrainId_fkey" FOREIGN KEY ("terrainId") REFERENCES "Terrain"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTranslation" ADD CONSTRAINT "ClassTranslation_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTranslation" ADD CONSTRAINT "ClassTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassPrimaryAbility" ADD CONSTRAINT "ClassPrimaryAbility_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassPrimaryAbility" ADD CONSTRAINT "ClassPrimaryAbility_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSavingThrow" ADD CONSTRAINT "ClassSavingThrow_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSavingThrow" ADD CONSTRAINT "ClassSavingThrow_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassProficiency" ADD CONSTRAINT "ClassProficiency_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassProficiency" ADD CONSTRAINT "ClassProficiency_proficiencyId_fkey" FOREIGN KEY ("proficiencyId") REFERENCES "Proficiency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassStartingEquipment" ADD CONSTRAINT "ClassStartingEquipment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassStartingEquipment" ADD CONSTRAINT "ClassStartingEquipment_equipmentId_fkey" FOREIGN KEY ("equipmentId") REFERENCES "Equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassLevel" ADD CONSTRAINT "ClassLevel_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassLevelSpellSlot" ADD CONSTRAINT "ClassLevelSpellSlot_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTableColumn" ADD CONSTRAINT "ClassTableColumn_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTableColumn" ADD CONSTRAINT "ClassTableColumn_subclassId_fkey" FOREIGN KEY ("subclassId") REFERENCES "Subclass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTableColumnTranslation" ADD CONSTRAINT "ClassTableColumnTranslation_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "ClassTableColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassTableColumnTranslation" ADD CONSTRAINT "ClassTableColumnTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassLevelValue" ADD CONSTRAINT "ClassLevelValue_classLevelId_fkey" FOREIGN KEY ("classLevelId") REFERENCES "ClassLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassLevelValue" ADD CONSTRAINT "ClassLevelValue_columnId_fkey" FOREIGN KEY ("columnId") REFERENCES "ClassTableColumn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSpellcasting" ADD CONSTRAINT "ClassSpellcasting_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSpellcasting" ADD CONSTRAINT "ClassSpellcasting_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellcastingSection" ADD CONSTRAINT "SpellcastingSection_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassSpellcasting"("classId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellcastingSectionTranslation" ADD CONSTRAINT "SpellcastingSectionTranslation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "SpellcastingSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellcastingSectionTranslation" ADD CONSTRAINT "SpellcastingSectionTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSpell" ADD CONSTRAINT "ClassSpell_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassSpell" ADD CONSTRAINT "ClassSpell_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MulticlassRequirement" ADD CONSTRAINT "MulticlassRequirement_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MulticlassRequirement" ADD CONSTRAINT "MulticlassRequirement_abilityScoreId_fkey" FOREIGN KEY ("abilityScoreId") REFERENCES "AbilityScore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMulticlassProficiency" ADD CONSTRAINT "ClassMulticlassProficiency_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassMulticlassProficiency" ADD CONSTRAINT "ClassMulticlassProficiency_proficiencyId_fkey" FOREIGN KEY ("proficiencyId") REFERENCES "Proficiency"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subclass" ADD CONSTRAINT "Subclass_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subclass" ADD CONSTRAINT "Subclass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subclass" ADD CONSTRAINT "Subclass_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubclassTranslation" ADD CONSTRAINT "SubclassTranslation_subclassId_fkey" FOREIGN KEY ("subclassId") REFERENCES "Subclass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubclassTranslation" ADD CONSTRAINT "SubclassTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubclassSpell" ADD CONSTRAINT "SubclassSpell_subclassId_fkey" FOREIGN KEY ("subclassId") REFERENCES "Subclass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubclassSpell" ADD CONSTRAINT "SubclassSpell_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubclassSpell" ADD CONSTRAINT "SubclassSpell_requiredFeatureId_fkey" FOREIGN KEY ("requiredFeatureId") REFERENCES "ClassFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFeature" ADD CONSTRAINT "ClassFeature_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFeature" ADD CONSTRAINT "ClassFeature_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFeature" ADD CONSTRAINT "ClassFeature_subclassId_fkey" FOREIGN KEY ("subclassId") REFERENCES "Subclass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFeature" ADD CONSTRAINT "ClassFeature_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ClassFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFeature" ADD CONSTRAINT "ClassFeature_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFeatureTranslation" ADD CONSTRAINT "ClassFeatureTranslation_classFeatureId_fkey" FOREIGN KEY ("classFeatureId") REFERENCES "ClassFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFeatureTranslation" ADD CONSTRAINT "ClassFeatureTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFeaturePrerequisite" ADD CONSTRAINT "ClassFeaturePrerequisite_classFeatureId_fkey" FOREIGN KEY ("classFeatureId") REFERENCES "ClassFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFeaturePrerequisite" ADD CONSTRAINT "ClassFeaturePrerequisite_requiredFeatureId_fkey" FOREIGN KEY ("requiredFeatureId") REFERENCES "ClassFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFeaturePrerequisite" ADD CONSTRAINT "ClassFeaturePrerequisite_requiredSpellId_fkey" FOREIGN KEY ("requiredSpellId") REFERENCES "Spell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spell" ADD CONSTRAINT "Spell_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spell" ADD CONSTRAINT "Spell_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "MagicSchool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spell" ADD CONSTRAINT "Spell_saveAbilityId_fkey" FOREIGN KEY ("saveAbilityId") REFERENCES "AbilityScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spell" ADD CONSTRAINT "Spell_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellTranslation" ADD CONSTRAINT "SpellTranslation_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellTranslation" ADD CONSTRAINT "SpellTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellDamageType" ADD CONSTRAINT "SpellDamageType_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpellDamageType" ADD CONSTRAINT "SpellDamageType_damageTypeId_fkey" FOREIGN KEY ("damageTypeId") REFERENCES "DamageType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================================
-- Contraintes CHECK (ajoutées à la main, voir docs/modelisation/conventions.md)
-- ============================================================================

-- Une seule langue et une seule édition par défaut
CREATE UNIQUE INDEX "Locale_single_default" ON "Locale" ("isDefault") WHERE "isDefault";
CREATE UNIQUE INDEX "Edition_single_default" ON "Edition" ("isDefault") WHERE "isDefault";

-- Une maîtrise désigne exactement une cible
ALTER TABLE "Proficiency" ADD CONSTRAINT "Proficiency_single_target"
  CHECK (num_nonnulls("skillId", "abilityScoreId", "equipmentId", "equipmentCategoryId") = 1);

-- Un choix a exactement un propriétaire
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_single_owner"
  CHECK (num_nonnulls("classId", "subclassId", "classFeatureId", "parentOptionId") = 1);

-- Une réserve a sa cible
ALTER TABLE "Choice" ADD CONSTRAINT "Choice_pool_target"
  CHECK ("pool" IS DISTINCT FROM 'EQUIPMENT_CATEGORY' OR "poolCategoryId" IS NOT NULL);

-- Un élément d'option donne exactement une chose
ALTER TABLE "ChoiceOptionItem" ADD CONSTRAINT "ChoiceOptionItem_single_target"
  CHECK (num_nonnulls("proficiencyId", "equipmentId", "equipmentCategoryId",
                      "classFeatureId", "creatureTypeId", "terrainId") = 1);

-- Une valeur de table de classe : au plus une valeur, dés complets
ALTER TABLE "ClassLevelValue" ADD CONSTRAINT "ClassLevelValue_single_value"
  CHECK (num_nonnulls("intValue", "diceCount", "boolValue") <= 1
         AND ("diceCount" IS NULL) = ("diceValue" IS NULL));

-- Le prérequis renseigne la cible correspondant à son type
ALTER TABLE "ClassFeaturePrerequisite" ADD CONSTRAINT "ClassFeaturePrerequisite_target"
  CHECK (
    ("type" = 'LEVEL' AND "minimumLevel" IS NOT NULL AND num_nonnulls("requiredFeatureId", "requiredSpellId") = 0)
    OR ("type" = 'FEATURE' AND "requiredFeatureId" IS NOT NULL AND num_nonnulls("minimumLevel", "requiredSpellId") = 0)
    OR ("type" = 'SPELL' AND "requiredSpellId" IS NOT NULL AND num_nonnulls("minimumLevel", "requiredFeatureId") = 0)
  );
