# Brouillons de modélisation

Domaines modélisés et relus, mais pas encore branchés sur `prisma/schema/` : ils n'ont pas encore d'importeur, donc n'ont pas été confrontés aux vraies données.

| Fichier | Étape de la feuille de route |
|---|---|
| `08-monstres.prisma` | 9 — monstres |
| `09-personnage.prisma` | 7 — modèle de personnage (aperçu en commentaires) |

Pour brancher un domaine, avec son importeur et sa propre migration :

1. Déplacer le fichier dans `prisma/schema/`, puis `npx prisma format` (ajoute les relations inverses).
2. Rajouter dans `03-choix.prisma` les propriétaires, cibles d'items, réserves et types de choix dont il a besoin (comme pour les races et historiques).
3. Mettre à jour les contraintes CHECK (`Choice_single_owner`, `ChoiceOptionItem_single_target`) dans la nouvelle migration.
4. Rajouter dans `src/srd/jsonb.ts` les schémas des colonnes JSONB du domaine (`Senses`, `SpellSlots` pour les monstres).
5. Ajouter le domaine au menu et aux formulaires de `src/directus/` puis relancer `npm run directus:config`.

Retirés en même temps, faute d'usage : `CreatureSubtype` (monstres), `WeaponMastery` (2024), les valeurs de table de classe de type texte.
