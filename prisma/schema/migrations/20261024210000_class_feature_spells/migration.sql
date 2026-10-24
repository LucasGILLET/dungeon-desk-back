-- CreateTable
CREATE TABLE "ClassFeatureSpell" (
    "id" SERIAL NOT NULL,
    "classFeatureId" INTEGER NOT NULL,
    "spellId" INTEGER NOT NULL,
    "atWill" BOOLEAN NOT NULL DEFAULT false,
    "oncePerLongRest" BOOLEAN NOT NULL DEFAULT false,
    "castAtLevel" INTEGER,

    CONSTRAINT "ClassFeatureSpell_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassFeatureSpell_classFeatureId_spellId_key" ON "ClassFeatureSpell"("classFeatureId", "spellId");

-- AddForeignKey
ALTER TABLE "ClassFeatureSpell" ADD CONSTRAINT "ClassFeatureSpell_classFeatureId_fkey" FOREIGN KEY ("classFeatureId") REFERENCES "ClassFeature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassFeatureSpell" ADD CONSTRAINT "ClassFeatureSpell_spellId_fkey" FOREIGN KEY ("spellId") REFERENCES "Spell"("id") ON DELETE CASCADE ON UPDATE CASCADE;

