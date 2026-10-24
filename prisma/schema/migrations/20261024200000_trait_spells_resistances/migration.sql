-- AlterTable
ALTER TABLE "Trait" ADD COLUMN     "spellAbilityId" INTEGER;

-- CreateTable
CREATE TABLE "TraitSpell" (
    "id" SERIAL NOT NULL,
    "traitId" INTEGER NOT NULL,
    "spellId" INTEGER NOT NULL,
    "requiredCharacterLevel" INTEGER NOT NULL DEFAULT 1,
    "castAtLevel" INTEGER,
    "oncePerLongRest" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TraitSpell_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TraitDamageResistance" (
    "id" SERIAL NOT NULL,
    "traitId" INTEGER NOT NULL,
    "damageTypeId" INTEGER NOT NULL,

    CONSTRAINT "TraitDamageResistance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TraitSpell_traitId_spellId_key" ON "TraitSpell"("traitId", "spellId");

-- CreateIndex
CREATE UNIQUE INDEX "TraitDamageResistance_traitId_damageTypeId_key" ON "TraitDamageResistance"("traitId", "damageTypeId");

-- AddForeignKey
ALTER TABLE "Trait" ADD CONSTRAINT "Trait_spellAbilityId_fkey" FOREIGN KEY ("spellAbilityId") REFERENCES "AbilityScore"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitSpell" ADD CONSTRAINT "TraitSpell_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "Trait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitSpell" ADD CONSTRAINT "TraitSpell_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitDamageResistance" ADD CONSTRAINT "TraitDamageResistance_traitId_fkey" FOREIGN KEY ("traitId") REFERENCES "Trait"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TraitDamageResistance" ADD CONSTRAINT "TraitDamageResistance_damageTypeId_fkey" FOREIGN KEY ("damageTypeId") REFERENCES "DamageType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

