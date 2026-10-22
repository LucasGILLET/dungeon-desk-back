-- CreateTable
CREATE TABLE "CampaignGmCharacter" (
    "id" SERIAL NOT NULL,
    "campaignId" INTEGER NOT NULL,
    "characterId" INTEGER NOT NULL,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignGmCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignGmCharacter_characterId_idx" ON "CampaignGmCharacter"("characterId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignGmCharacter_campaignId_characterId_key" ON "CampaignGmCharacter"("campaignId", "characterId");

-- AddForeignKey
ALTER TABLE "CampaignGmCharacter" ADD CONSTRAINT "CampaignGmCharacter_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignGmCharacter" ADD CONSTRAINT "CampaignGmCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
