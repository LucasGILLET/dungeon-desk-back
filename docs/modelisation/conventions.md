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
| Clé primaire | toujours un `id` autoincrémenté, même pour les traductions et liaisons (Directus ignore les clés composées) ; la clé naturelle devient un `@@unique`. Une clé primaire n'est jamais aussi une clé étrangère : pour une table 1-1, `id` + `equipmentId @unique` (Directus ne suit pas une relation au-delà d'un niveau sinon) | `@@unique([classId, localeCode])` |
| Unité dans un nom de colonne | suffixe explicite | `rangeFt`, `weightLb`, `materialCostGp` |
| Enum | PascalCase, valeurs SCREAMING_SNAKE_CASE | `CastingTimeUnit.BONUS_ACTION` |

Les tables gardent le nom des modèles Prisma (pas de `@@map`) : Directus et les requêtes SQL manuelles voient les mêmes noms que le code.

## 2. Contraintes SQL écrites à la main

Prisma ne sait pas exprimer les contraintes `CHECK`. Elles sont ajoutées à la fin du fichier `migration.sql` de la migration qui crée les tables concernées, sous un bloc commenté `-- Contraintes CHECK (ajoutées à la main)`.

| Table | Contrainte |
|---|---|
| `Choice` | exactement un propriétaire : `num_nonnulls("classId", "subclassId", "classFeatureId", "raceId", "subraceId", "traitId", "backgroundId", "parentOptionId") = 1` |
| `Choice` | une réserve a sa cible : `pool = 'EQUIPMENT_CATEGORY'` ⇒ `poolCategoryId` renseigné |
| `ChoiceOptionItem` | exactement une cible : proficiency, equipment, equipmentCategory, classFeature, creatureType, terrain, language, abilityScore, spell, trait, ou une somme (`currencyAmount` et `currency` ensemble) ; `bonus` seulement avec une caractéristique |
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
- **Tables enfants** (niveaux, colonnes, liaisons) : elles sont remplacées en bloc à chaque import de leur parent (suppression puis recréation), dans une transaction par entité.
- **Lignes référencées par les personnages** : les choix, leurs options et les entrées des tables de personnalité sont mis à jour en place, par position chez leur propriétaire, pour garder leurs `id`. Seules les lignes en trop sont supprimées, ce qui échoue (`Restrict`) si un personnage les a choisies : le seed ne casse jamais un personnage en silence.
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
- **Repli sur la langue par défaut** : chaque texte est renvoyé dans la langue demandée, sinon dans la langue par défaut, sinon dans la seule langue disponible (contenu maison écrit en français). Le champ `lang` de l'objet indique la langue effectivement utilisée pour son nom.
- **Identifiants des choix** : les choix et leurs options n'ont pas d'index ; l'API renvoie leur `id`, que le front renvoie pour y répondre.
- **Réponse aplatie** : les traductions sont fusionnées dans l'objet (`name`, `description`…) au lieu d'être renvoyées sous forme de tableau. Les références vers d'autres entités sont renvoyées sous la forme `{ index, name }`.
- **Cache** : le contenu SRD change rarement. Les réponses portent `Cache-Control: public, max-age=3600` et un `ETag`. Le front utilise Vue Query avec un `staleTime` long.
- **Distances** : toujours en pieds dans l'API. Le front les convertit à l'affichage selon la langue (1,5 m pour 5 pieds).

## 6. API des personnages

```
GET    /api/characters            liste (noms traduits, classes et niveaux)
GET    /api/characters/:id        fiche complète
POST   /api/characters/preview    aperçu sans enregistrement (public)
POST   /api/characters            création
PUT    /api/characters/:id        modification, montée de niveau, inventaire
DELETE /api/characters/:id
```

- **Personnage complet** : le front envoie toujours tout le personnage, au format de `src/characters/input.ts`. Les données de jeu y sont désignées par leur `index`, les choix et options par leur `id`. La fiche renvoyée reprend ce format, qu'on peut modifier puis renvoyer tel quel.
- **Validation** (`src/characters/rules.ts`) : tout contenu doit exister dans l'édition du personnage ; niveaux continus et ordre de prise cohérent ; sous-classe, augmentations de caractéristique et dons aux bons niveaux ; prérequis de multiclassage et de don ; réponses limitées aux choix accessibles (race, classe de départ ou suivante, niveau de la capacité, option parente choisie) et au nombre `choose` ; sorts de la liste de la classe et d'un niveau lançable. Un personnage invalide est refusé (400, avec le chemin de chaque erreur).
- **Incomplet n'est pas invalide** : un choix non répondu, une sous-classe ou une augmentation de caractéristique pas encore choisie sont acceptés et listés dans `sheet.pending`. C'est ce qui guide la montée de niveau.
- **Fiche calculée** (`sheet`) : niveau, bonus de maîtrise, caractéristiques finales et modificateurs, PV maximum. Rien de tout ça n'est stocké. Si une donnée de jeu change et rend un personnage invalide, la fiche le signale dans `warnings` au lieu d'échouer.
- **Aperçu** (`POST /api/characters/preview`, sans authentification) : le créateur envoie le personnage en cours et reçoit la fiche calculée (maîtrises et langues comprises), les choix accessibles décrits et traduits (source, options avec ce qu'elles donnent, candidats d'une réserve ; un sous-choix suit l'option qui l'ouvre) et l'équipement de départ qui découle des réponses. Le front affiche ces choix sans connaître les règles.
