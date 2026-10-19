# Changelog

Toutes les versions notables de ce projet sont documentées dans ce fichier.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet suit le [Semantic Versioning](https://semver.org/lang/fr/).

> Les versions antérieures à 1.0.0 ont été reconstituées a posteriori à partir
> de l'historique Git (aucun tag n'existait avant juillet 2026) afin de
> documenter l'évolution du projet pour le dossier de certification.

## [Non publié]

Données de jeu en base (branche `feat/srd-database`).

### Ajouté
- Base relationnelle des données du SRD 5.1, multi-édition et traduite
  (une table `*Translation` par entité) : référentiels, équipement,
  classes et sous-classes, races, historiques, dons, sorts, monstres,
  objets magiques, règles du SRD ; seed idempotent depuis
  `prisma/data/2014/` (`npx prisma db seed`).
- Routes publiques `/api/srd/:edition/…` (classes, races, historiques,
  sorts, monstres, objets magiques, règles, guides, règles de création,
  tables du générateur de PNJ).
- Personnages au format relationnel : création, aperçu, fiche calculée
  (CA, PV, emplacements de sorts, ressources), montée de niveau et
  multiclassage, inventaire, sorts connus et préparés.
- Campagnes : invitation des joueurs par lien, séances, quêtes, PNJ,
  rencontres avec calcul de difficulté (Guide du maître 2014) ; le MJ lit
  la fiche des personnages de ses joueurs.
- Guides de l'application (pages de documentation, aide-mémoire de
  combat) en base, rédigeables dans Directus.
- Back-office Directus configuré par script (`npm run directus:config`) :
  menus, formulaires, rôles (éditeur, traducteur, rédacteur), flow de
  remplissage automatique des guides.

### Modifié
- PNJ : traits en colonnes (plus de JSON), race, classe et alignement
  référencés.
- L'adresse Auth0 utilisée pour récupérer l'e-mail d'un utilisateur vient
  de `AUTH0_ISSUER` (elle était écrite en dur).

### Sécurité
- Express 4.22.1 → 4.22.3 (avec `proxy-addr` 2.0.8, `path-to-regexp`
  0.1.13, `body-parser` 1.20.8, `qs` 6.16), `express-rate-limit` 8.2.1 →
  8.7.0 (avec `ip-address` 10.7.3), `compression` 1.8.2, `morgan` 1.12.1,
  `js-yaml` 4.3.2 et `minimatch` 3.1.5 (via `swagger-jsdoc`) : corrige les
  12 vulnérabilités de production signalées par `npm audit` (dont
  l'usurpation d'IP de `proxy-addr`, critique, et le contournement du rate
  limiting par adresses IPv4 mappées en IPv6), sans passer à Express 5.

### Supprimé
- Ancienne connexion par e-mail et mot de passe (`/api/auth/register`,
  `/api/auth/login`, JWT et bcrypt) : plus appelée depuis le front, qui
  passe uniquement par Auth0 ; `JWT_SECRET` n'est plus utilisé.
- Colonne JSON `data` des personnages : la migration
  `20261017100000_character_model` supprime les personnages existants.

## [1.0.0] - 2026-07-07

Version de référence pour la certification RNCP39583.

### Sécurité
- Ajout de `helmet` (en-têtes de sécurité HTTP).
- Validation Zod sur `PUT /characters/:id` (absente jusqu'ici) et sur
  `POST /npcs`.
- Validation systématique des `:id` de route (doivent être des entiers
  positifs).
- Les requêtes de mise à jour/suppression refiltrent désormais par
  `userId` au niveau de la requête Prisma elle-même (`updateMany` /
  `deleteMany`), plus seulement via une vérification préalable dissociée.

### Corrigé
- `updateCharacter` dérivait les colonnes `race`/`class` de champs que le
  frontend n'envoie jamais : modifier la race ou la classe d'un
  personnage existant ne mettait jamais à jour ces colonnes en base.

### Modifié
- Remplacement des `console.error` bruts par le logger Winston structuré
  dans les contrôleurs, le middleware d'authentification et le health
  check.
- Le pipeline de déploiement vérifie désormais la compilation TypeScript
  avant d'exécuter les migrations de base de données (auparavant, une
  erreur de type n'était détectée qu'au build Docker, après les
  migrations).

## [0.4.0] - 2026-04-04

### Ajouté
- Client API généré via Orval + Vue Query (contrat partagé avec le
  frontend).
- Journalisation avec Winston et Morgan, métriques Prometheus pour le
  suivi des performances HTTP.

### Modifié
- Refactorisation du type `Character`, renforcement de la validation des
  données de personnage (noms de race/classe, champs optionnels).

## [0.3.0] - 2026-02-27

### Ajouté
- Authentification via Auth0 (en complément de l'authentification JWT
  interne existante).
- Automatisation des migrations Prisma au déploiement.

## [0.2.0] - 2026-02-08

### Ajouté
- Validation des données d'entrée et première suite de tests unitaires.
- Modification des personnages sauvegardés.

## [0.1.0] - 2026-02-07

### Ajouté
- Socle initial du projet (Express + TypeScript + Prisma + PostgreSQL).
- Authentification JWT (inscription/connexion, mots de passe hachés avec
  bcrypt).
- Rate limiting et premières mesures de sécurité.
