-- Contraintes CHECK du gestionnaire de combat (ajoutées à la main, voir docs/modelisation/conventions.md)
ALTER TABLE "Combat" ADD CONSTRAINT "Combat_round_turn"
  CHECK ("round" >= 1 AND "turn" >= 0);

-- Un lien vers un personnage pour un PJ seulement, vers un monstre pour un monstre ;
-- PV jamais négatifs ; états : liste d'index
ALTER TABLE "Combatant" ADD CONSTRAINT "Combatant_values"
  CHECK ("position" >= 0 AND "tempHitPoints" >= 0
    AND ("hitPoints" IS NULL OR "hitPoints" >= 0)
    AND ("maxHitPoints" IS NULL OR "maxHitPoints" > 0)
    AND ("characterId" IS NULL OR "kind" = 'CHARACTER')
    AND ("monsterId" IS NULL OR "kind" = 'MONSTER')
    AND jsonb_typeof("conditions") = 'array');
