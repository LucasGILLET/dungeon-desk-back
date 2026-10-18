-- CreateEnum
CREATE TYPE "GuideAccent" AS ENUM ('NEUTRAL', 'SLATE', 'ZINC', 'RED', 'ORANGE', 'AMBER', 'YELLOW', 'EMERALD', 'TEAL', 'CYAN', 'SKY', 'BLUE', 'VIOLET', 'FUCHSIA', 'ROSE');

-- CreateTable
CREATE TABLE "RuleChapter" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "RuleChapter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleChapterTranslation" (
    "id" SERIAL NOT NULL,
    "ruleChapterId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "RuleChapterTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleSection" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "chapterId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "RuleSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleSectionTranslation" (
    "id" SERIAL NOT NULL,
    "ruleSectionId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "RuleSectionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidePage" (
    "id" SERIAL NOT NULL,
    "editionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "icon" TEXT,
    "accent" "GuideAccent",

    CONSTRAINT "GuidePage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuidePageTranslation" (
    "id" SERIAL NOT NULL,
    "guidePageId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "shortTitle" TEXT,
    "eyebrow" TEXT,
    "heading" TEXT,
    "intro" TEXT,

    CONSTRAINT "GuidePageTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideSection" (
    "id" SERIAL NOT NULL,
    "pageId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "icon" TEXT,
    "accent" "GuideAccent",

    CONSTRAINT "GuideSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideSectionTranslation" (
    "id" SERIAL NOT NULL,
    "guideSectionId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "body" TEXT,

    CONSTRAINT "GuideSectionTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideCard" (
    "id" SERIAL NOT NULL,
    "sectionId" INTEGER NOT NULL,
    "index" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "icon" TEXT,
    "accent" "GuideAccent",
    "classId" INTEGER,
    "raceId" INTEGER,
    "ruleSectionId" INTEGER,
    "detailSectionId" INTEGER,

    CONSTRAINT "GuideCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideCardTranslation" (
    "id" SERIAL NOT NULL,
    "guideCardId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "eyebrow" TEXT,
    "summary" TEXT,
    "advice" TEXT,

    CONSTRAINT "GuideCardTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideCardList" (
    "id" SERIAL NOT NULL,
    "cardId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "GuideCardList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuideCardListTranslation" (
    "id" SERIAL NOT NULL,
    "guideCardListId" INTEGER NOT NULL,
    "localeCode" TEXT NOT NULL,
    "label" TEXT,
    "items" TEXT NOT NULL,

    CONSTRAINT "GuideCardListTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RuleChapter_editionId_index_key" ON "RuleChapter"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "RuleChapterTranslation_ruleChapterId_localeCode_key" ON "RuleChapterTranslation"("ruleChapterId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "RuleSection_editionId_index_key" ON "RuleSection"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "RuleSectionTranslation_ruleSectionId_localeCode_key" ON "RuleSectionTranslation"("ruleSectionId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "GuidePage_editionId_index_key" ON "GuidePage"("editionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "GuidePageTranslation_guidePageId_localeCode_key" ON "GuidePageTranslation"("guidePageId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "GuideSection_pageId_index_key" ON "GuideSection"("pageId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "GuideSectionTranslation_guideSectionId_localeCode_key" ON "GuideSectionTranslation"("guideSectionId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "GuideCard_sectionId_index_key" ON "GuideCard"("sectionId", "index");

-- CreateIndex
CREATE UNIQUE INDEX "GuideCardTranslation_guideCardId_localeCode_key" ON "GuideCardTranslation"("guideCardId", "localeCode");

-- CreateIndex
CREATE UNIQUE INDEX "GuideCardList_cardId_position_key" ON "GuideCardList"("cardId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "GuideCardListTranslation_guideCardListId_localeCode_key" ON "GuideCardListTranslation"("guideCardListId", "localeCode");

-- AddForeignKey
ALTER TABLE "RuleChapter" ADD CONSTRAINT "RuleChapter_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleChapterTranslation" ADD CONSTRAINT "RuleChapterTranslation_ruleChapterId_fkey" FOREIGN KEY ("ruleChapterId") REFERENCES "RuleChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleChapterTranslation" ADD CONSTRAINT "RuleChapterTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleSection" ADD CONSTRAINT "RuleSection_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleSection" ADD CONSTRAINT "RuleSection_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "RuleChapter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleSectionTranslation" ADD CONSTRAINT "RuleSectionTranslation_ruleSectionId_fkey" FOREIGN KEY ("ruleSectionId") REFERENCES "RuleSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleSectionTranslation" ADD CONSTRAINT "RuleSectionTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidePage" ADD CONSTRAINT "GuidePage_editionId_fkey" FOREIGN KEY ("editionId") REFERENCES "Edition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidePageTranslation" ADD CONSTRAINT "GuidePageTranslation_guidePageId_fkey" FOREIGN KEY ("guidePageId") REFERENCES "GuidePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuidePageTranslation" ADD CONSTRAINT "GuidePageTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideSection" ADD CONSTRAINT "GuideSection_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "GuidePage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideSectionTranslation" ADD CONSTRAINT "GuideSectionTranslation_guideSectionId_fkey" FOREIGN KEY ("guideSectionId") REFERENCES "GuideSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideSectionTranslation" ADD CONSTRAINT "GuideSectionTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideCard" ADD CONSTRAINT "GuideCard_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "GuideSection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideCard" ADD CONSTRAINT "GuideCard_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideCard" ADD CONSTRAINT "GuideCard_raceId_fkey" FOREIGN KEY ("raceId") REFERENCES "Race"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideCard" ADD CONSTRAINT "GuideCard_ruleSectionId_fkey" FOREIGN KEY ("ruleSectionId") REFERENCES "RuleSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideCard" ADD CONSTRAINT "GuideCard_detailSectionId_fkey" FOREIGN KEY ("detailSectionId") REFERENCES "GuideSection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideCardTranslation" ADD CONSTRAINT "GuideCardTranslation_guideCardId_fkey" FOREIGN KEY ("guideCardId") REFERENCES "GuideCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideCardTranslation" ADD CONSTRAINT "GuideCardTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideCardList" ADD CONSTRAINT "GuideCardList_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "GuideCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideCardListTranslation" ADD CONSTRAINT "GuideCardListTranslation_guideCardListId_fkey" FOREIGN KEY ("guideCardListId") REFERENCES "GuideCardList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuideCardListTranslation" ADD CONSTRAINT "GuideCardListTranslation_localeCode_fkey" FOREIGN KEY ("localeCode") REFERENCES "Locale"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

