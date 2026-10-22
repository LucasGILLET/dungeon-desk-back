-- CreateEnum
CREATE TYPE "CombatantKind" AS ENUM ('CHARACTER', 'MONSTER', 'OTHER');

-- CreateTable
CREATE TABLE "Combat" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "encounterId" INTEGER,
    "name" TEXT NOT NULL,
    "round" INTEGER NOT NULL DEFAULT 1,
    "turn" INTEGER NOT NULL DEFAULT 0,
    "finished" BOOLEAN NOT NULL DEFAULT false,
    "shareCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Combat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Combatant" (
    "id" SERIAL NOT NULL,
    "combatId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    "kind" "CombatantKind" NOT NULL,
    "characterId" INTEGER,
    "monsterId" INTEGER,
    "name" TEXT NOT NULL,
    "initiative" INTEGER,
    "initiativeBonus" INTEGER NOT NULL DEFAULT 0,
    "armorClass" INTEGER,
    "maxHitPoints" INTEGER,
    "hitPoints" INTEGER,
    "tempHitPoints" INTEGER NOT NULL DEFAULT 0,
    "conditions" JSONB NOT NULL DEFAULT '[]',
    "note" TEXT,
    "hidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Combatant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Combat_shareCode_key" ON "Combat"("shareCode");

-- CreateIndex
CREATE INDEX "Combat_campaignId_idx" ON "Combat"("campaignId");

-- CreateIndex
CREATE INDEX "Combatant_combatId_position_idx" ON "Combatant"("combatId", "position");

-- AddForeignKey
ALTER TABLE "Combat" ADD CONSTRAINT "Combat_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combat" ADD CONSTRAINT "Combat_encounterId_fkey" FOREIGN KEY ("encounterId") REFERENCES "Encounter"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combatant" ADD CONSTRAINT "Combatant_combatId_fkey" FOREIGN KEY ("combatId") REFERENCES "Combat"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combatant" ADD CONSTRAINT "Combatant_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Combatant" ADD CONSTRAINT "Combatant_monsterId_fkey" FOREIGN KEY ("monsterId") REFERENCES "Monster"("id") ON DELETE SET NULL ON UPDATE CASCADE;
