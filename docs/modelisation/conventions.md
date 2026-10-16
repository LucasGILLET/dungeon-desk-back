# Conventions des données de jeu (SRD)

Ce document complète l'en-tête de [`prisma/schema/00-base.prisma`](../../prisma/schema/00-base.prisma), qui décrit les conventions de modélisation. Il fixe ce qui se passe autour du schéma : nommage, contraintes SQL, JSONB, seed et API.

## 1. Nommage

| Élément | Règle | Exemple |
|---|---|---|
| Modèle | PascalCase anglais, singulier | `ClassFeature` |
| Table de traduction | `<Modèle>Translation` | `ClassFeatureTranslation` |
| Table de liaison | `<Parent><Enfant>` | `ClassSpell`, `RaceTrait` |
| Clé étrangère | `<relation>Id` | `abilityScoreId` |
| Clé de langue | `localeCode` (→ `Locale.code`) | `"fr"` |
| Clé métier | `index`, slug anglais en kebab-case, repris du SRD | `"arcane-recovery"` |
| Clé primaire | toujours un `id` autoincrémenté, même pour les traductions et liaisons (Directus ignore les clés composées) ; la clé naturelle devient un `@@unique` | `@@unique([classId, localeCode])` |
| Unité dans un nom de colonne | suffixe explicite | `rangeFt`, `weightLb`, `materialCostGp` |
| Enum | PascalCase, valeurs SCREAMING_SNAKE_CASE | `CastingTimeUnit.BONUS_ACTION` |

Les tables gardent le nom des modèles Prisma (pas de `@@map`) : Directus et les requêtes SQL manuelles voient les mêmes noms que le code.

## 2. Contraintes SQL écrites à la main

Prisma ne sait pas exprimer les contraintes `CHECK`. Elles sont ajoutées à la fin du fichier `migration.sql` de la migration qui crée les tables concernées, sous un bloc commenté `-- Contraintes CHECK (ajoutées à la main)`.

| Table | Contrainte |
|---|---|
| `Choice` | exactement un propriétaire : `num_nonnulls("classId", "subclassId", "classFeatureId", "parentOptionId") = 1` |
| `Choice` | une réserve a sa cible : `pool = 'EQUIPMENT_CATEGORY'` ⇒ `poolCategoryId` renseigné |
| `ChoiceOptionItem` | exactement une cible : proficiency, equipment, equipmentCategory, classFeature, creatureType ou terrain |
| `Proficiency` | exactement une cible : `num_nonnulls("skillId", "abilityScoreId", "equipmentId", "equipmentCategoryId") = 1` |
| `ClassLevelValue` | au plus une valeur ; `diceCount` et `diceValue` vont ensemble |
| `ClassFeaturePrerequisite` | la cible correspond au `type` |
| `Locale` | une seule langue par défaut : index unique partiel `WHERE "isDefault"` |
| `Edition` | une seule édition par défaut : index unique partiel `WHERE "isDefault"` |

## 3. Colonnes JSONB

- Elles ne contiennent que des valeurs neutres en langue : nombres, notation de dés, index.
- Chaque colonne est validée par un schéma Zod de [`src/srd/jsonb.ts`](../../src/srd/jsonb.ts), dont le nom est indiqué en commentaire dans le schéma Prisma (`// JSONB Speeds : …`).
- La validation a lieu à l'écriture : dans le seed, et plus tard dans l'API d'administration. Une donnée invalide fait échouer l'import au lieu d'être enregistrée.

## 4. Seed

- **Données sources** : `prisma/data/<édition>/<langue>/` pour le SRD et `prisma/data/<édition>/custom/` pour les compléments absents du SRD (libellés des colonnes de table de classe, types de créatures, terrains). Les fichiers SRD sont des copies de ceux du front, qui continue d'utiliser les siens jusqu'à la bascule (étape 8).
- **Idempotence** : chaque import fait un upsert sur la clé métier (`[editionId, index]`, ou `index` pour les référentiels partagés). Relancer le seed met les données à jour sans créer de doublons.
- **Tables enfants** (niveaux, colonnes, choix, liaisons) : elles sont remplacées en bloc à chaque import de leur parent (suppression puis recréation), dans une transaction par entité.
- **Langues** : un import lit le fichier anglais, qui fait référence, puis complète les traductions à partir des fichiers de chaque langue disponible, en associant les entrées par `index`. Une entrée sans traduction dans une langue est importée quand même ; l'API se rabattra sur la langue par défaut.
- **Ordre** : langues et éditions, puis référentiels, puis équipement et maîtrises, puis sorts, puis classes. Chaque importeur ne dépend que des précédents.
- **Commande** : `npx prisma db seed`. Le paramètre facultatif `--only <domaine>` limite l'import.

## 5. API (lecture)

```
GET /api/srd/editions
GET /api/srd/:edition/classes?lang=fr
GET /api/srd/:edition/classes/:index?lang=fr
```

- `:edition` est le code de l'édition (`2014`, `2024`).
- `lang` est facultatif. Par défaut, l'API lit l'en-tête `Accept-Language`, puis se rabat sur la langue par défaut.
- **Repli sur la langue par défaut** : chaque texte est renvoyé dans la langue demandée, sinon dans la langue par défaut. Le champ `lang` de l'objet indique la langue effectivement utilisée pour son nom.
- **Réponse aplatie** : les traductions sont fusionnées dans l'objet (`name`, `description`…) au lieu d'être renvoyées sous forme de tableau. Les références vers d'autres entités sont renvoyées sous la forme `{ index, name }`.
- **Cache** : le contenu SRD change rarement. Les réponses portent `Cache-Control: public, max-age=3600` et un `ETag`. Le front utilise Vue Query avec un `staleTime` long.
- **Distances** : toujours en pieds dans l'API. Le front les convertit à l'affichage selon la langue (1,5 m pour 5 pieds).
