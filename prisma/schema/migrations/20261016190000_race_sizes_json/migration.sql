-- Race.sizes : tableau d'enum → JSONB (Directus ne sait pas éditer un tableau d'enum).
-- Conversion sans perte : {MEDIUM} → ["MEDIUM"]
ALTER TABLE "Race" ALTER COLUMN "sizes" TYPE JSONB USING to_jsonb("sizes");
ALTER TABLE "Race" ALTER COLUMN "sizes" SET NOT NULL;
