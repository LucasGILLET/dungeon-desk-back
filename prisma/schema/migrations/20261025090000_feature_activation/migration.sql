-- CreateEnum
CREATE TYPE "ActivationType" AS ENUM ('ACTION', 'BONUS_ACTION', 'REACTION');

-- AlterTable
ALTER TABLE "ClassFeature" ADD COLUMN     "activation" "ActivationType";

-- AlterTable
ALTER TABLE "Trait" ADD COLUMN     "activation" "ActivationType";

