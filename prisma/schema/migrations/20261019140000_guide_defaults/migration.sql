-- Édition par défaut, pour les guides créés dans Directus sans édition (écrit à la main)
CREATE FUNCTION "default_edition_id"() RETURNS integer
  LANGUAGE sql STABLE
  AS $$ SELECT "id" FROM "Edition" WHERE "isDefault" ORDER BY "position" LIMIT 1 $$;

-- AlterTable
ALTER TABLE "GuideCard" ALTER COLUMN "index" SET DEFAULT (gen_random_uuid())::text,
ALTER COLUMN "position" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "GuideCardList" ALTER COLUMN "position" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "GuidePage" ALTER COLUMN "editionId" SET DEFAULT default_edition_id(),
ALTER COLUMN "index" SET DEFAULT (gen_random_uuid())::text,
ALTER COLUMN "position" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "GuideSection" ALTER COLUMN "index" SET DEFAULT (gen_random_uuid())::text,
ALTER COLUMN "position" SET DEFAULT 0;

