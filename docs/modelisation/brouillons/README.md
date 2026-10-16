# Brouillons de modélisation

Domaines modélisés et relus, mais pas encore branchés sur `prisma/schema/` : ils n'ont pas encore d'importeur, donc n'ont pas été confrontés aux vraies données.

| Fichier | Étape de la feuille de route |
|---|---|
| `05-races.prisma` | 6 — races / espèces, sous-races, traits |
| `06-historiques-dons.prisma` | 6 — historiques et dons |
| `08-monstres.prisma` | 9 — monstres |
| `09-personnage.prisma` | 7 — modèle de personnage (aperçu en commentaires) |

Pour brancher un domaine, avec son importeur et sa propre migration :

1. Déplacer le fichier dans `prisma/schema/`, puis `npx prisma format` (ajoute les relations inverses).
2. Rajouter dans `03-choix.prisma` les propriétaires (`raceId`, `subraceId`, `traitId`, `backgroundId`, `featId`), les cibles d'items (`languageId`, `abilityScoreId`, `spellId`, `traitId`, `featId`, `bonus`, `currencyAmount`/`currency`), les réserves (`ANY_LANGUAGE`, `SPELL_LIST`, `FEAT_CATEGORY`…) et les types de choix (`LANGUAGE`, `ABILITY_SCORE_INCREASE`, `SPELL`, `FEAT`) dont il a besoin.
3. Mettre à jour les contraintes CHECK (`Choice_single_owner`, `ChoiceOptionItem_single_target`) dans la nouvelle migration.
4. Rajouter dans `src/srd/jsonb.ts` les schémas des colonnes JSONB du domaine (`Speeds`, `Senses`, `Usage`, `SpellSlots`, `TraitAction`).

Retirés en même temps, faute d'usage : `CreatureSubtype` (monstres), `WeaponMastery` (2024), les valeurs de table de classe de type texte.
