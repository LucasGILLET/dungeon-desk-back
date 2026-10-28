-- Images du SRD reprises de dnd5eapi.co, générées par IA : retirées
UPDATE "Monster" SET "imageUrl" = NULL WHERE "imageUrl" LIKE 'https://www.dnd5eapi.co/%';
UPDATE "MagicItem" SET "imageUrl" = NULL WHERE "imageUrl" LIKE 'https://www.dnd5eapi.co/%';
UPDATE "Equipment" SET "imageUrl" = NULL WHERE "imageUrl" LIKE 'https://www.dnd5eapi.co/%';
