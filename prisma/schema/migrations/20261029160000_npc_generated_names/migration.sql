-- Noms de PNJ générés par le front (sonorités de chaque race) : plus de listes
DELETE FROM "NpcTableEntry" WHERE "kind" IN ('FIRST_NAME', 'LAST_NAME', 'NAME_PREFIX', 'NAME_SUFFIX');

-- Seuls les noms propres avaient une valeur sans traduction
ALTER TABLE "NpcTableEntry" DROP COLUMN "value";

-- AlterEnum
CREATE TYPE "NpcTableKind_new" AS ENUM ('BODY_TYPE', 'SOCIAL_STATUS', 'PROFESSION', 'RELATION', 'PERSONALITY', 'MOTIVATION', 'QUIRK', 'ORIGIN', 'HISTORY_EVENT');
ALTER TABLE "NpcTableEntry" ALTER COLUMN "kind" TYPE "NpcTableKind_new" USING ("kind"::text::"NpcTableKind_new");
ALTER TYPE "NpcTableKind" RENAME TO "NpcTableKind_old";
ALTER TYPE "NpcTableKind_new" RENAME TO "NpcTableKind";
DROP TYPE "NpcTableKind_old";
