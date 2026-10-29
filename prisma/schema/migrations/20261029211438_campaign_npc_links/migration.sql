-- PNJ de la campagne rencontrés pendant une séance, ou mêlés à une quête
-- CreateTable
CREATE TABLE "CampaignSessionNpc" (
    "id" SERIAL NOT NULL,
    "sessionId" INTEGER NOT NULL,
    "campaignNpcId" INTEGER NOT NULL,

    CONSTRAINT "CampaignSessionNpc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestNpc" (
    "id" SERIAL NOT NULL,
    "questId" INTEGER NOT NULL,
    "campaignNpcId" INTEGER NOT NULL,

    CONSTRAINT "QuestNpc_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CampaignSessionNpc_campaignNpcId_idx" ON "CampaignSessionNpc"("campaignNpcId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignSessionNpc_sessionId_campaignNpcId_key" ON "CampaignSessionNpc"("sessionId", "campaignNpcId");

-- CreateIndex
CREATE INDEX "QuestNpc_campaignNpcId_idx" ON "QuestNpc"("campaignNpcId");

-- CreateIndex
CREATE UNIQUE INDEX "QuestNpc_questId_campaignNpcId_key" ON "QuestNpc"("questId", "campaignNpcId");

-- AddForeignKey
ALTER TABLE "CampaignSessionNpc" ADD CONSTRAINT "CampaignSessionNpc_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CampaignSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignSessionNpc" ADD CONSTRAINT "CampaignSessionNpc_campaignNpcId_fkey" FOREIGN KEY ("campaignNpcId") REFERENCES "CampaignNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestNpc" ADD CONSTRAINT "QuestNpc_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestNpc" ADD CONSTRAINT "QuestNpc_campaignNpcId_fkey" FOREIGN KEY ("campaignNpcId") REFERENCES "CampaignNpc"("id") ON DELETE CASCADE ON UPDATE CASCADE;
