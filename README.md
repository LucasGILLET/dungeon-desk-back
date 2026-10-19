# Dungeon Desk Backend

Backend API pour l'application Dungeon Desk, construit avec Express, TypeScript, Prisma et PostgreSQL. Les données de jeu (SRD 5.1 : classes, races, sorts, monstres, objets magiques, règles…) sont en base, éditées dans Directus ; le front les lit par l'API (`/api/srd/:edition/…`).

## Prérequis

- [Node.js](https://nodejs.org/) (v18+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)

## Installation

1. Accédez au dossier du backend :
   ```bash
   cd dungeon-desk-back
   ```

2. Installez les dépendances :
   ```bash
   npm install
   ```

3. Créez le fichier `.env` en copiant [`.env.example`](.env.example) (base locale, origine du front, Auth0).

## Lancement (Backend)

### Via Docker (Recommandé)
Pour lancer PostgreSQL et l'API en tâche de fond :
```bash
docker compose up -d
```
L'API sera accessible sur `http://localhost:3000` (documentation Swagger sur `/api-docs`). Après une modification du code : `docker compose up -d --build api`.

### Via Node.js (Développement)
Pour lancer le serveur en local avec rechargement automatique :
```bash
npm install
npm run dev
```

## Base de données (Prisma)

Le schéma est réparti par domaine dans [`prisma/schema/`](prisma/schema/), les migrations dans `prisma/schema/migrations/`. Détail des tables, conventions et diagrammes : [`docs/modelisation/`](docs/modelisation/README.md).

Sur une base vierge (ou après une mise à jour) :
```bash
npx prisma migrate deploy   # applique les migrations
npx prisma db seed          # importe les données de jeu (environ 1 min, idempotent)
```

Le seed accepte `--only <domaines>` (par exemple `npx prisma db seed -- --only monstres,regles`) ; liste des domaines et options dans [`docs/modelisation/README.md`](docs/modelisation/README.md#seed).

## Back-office (Directus)

Directus sert à éditer les données de jeu et les pages de documentation. En local :
```bash
docker compose -f docker-compose.directus.yml up -d   # http://localhost:8055
npm run directus:config                               # menus, formulaires, rôles, flows (idempotent, ~3 min)
```

Les secrets (`SECRET`, compte admin, `ADMIN_TOKEN`, licence) sont dans `.env.directus`, non versionné : partir de [`.env.directus.example`](.env.directus.example). `npm run directus:config -- --only roles,forms` ne relance que certaines étapes (`settings, menu, fields, translations, relations, forms, roles`).

Rôles fournis : éditeur des données de jeu, traducteur, rédacteur de la documentation.

## Tests

```bash
npm test          # Vitest
npx tsc --noEmit  # vérification des types
```

## Commandes Utiles

- **Accéder au studio Prisma (Interface graphique pour voir la BDD) :**
  ```bash
  npx prisma studio
  ```
  Accessible ensuite sur `http://localhost:5555`.

- **Créer une migration après modification d'un fichier de `prisma/schema/` :**
  ```bash
  npx prisma migrate dev --name nom_de_la_migration
  ```
  Les contraintes CHECK s'ajoutent à la main dans le fichier SQL généré (voir [`docs/modelisation/conventions.md`](docs/modelisation/conventions.md)).

- **Générer le client Prisma :**
  ```bash
  npx prisma generate
  ```
