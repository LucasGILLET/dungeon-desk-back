# Dungeon Desk Backend

Backend API pour l'application Dungeon Desk, construit avec Express, TypeScript, Prisma et PostgreSQL.

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

3. Créez un fichier `.env` à la racine (s'il n'existe pas déjà) en copiant l'exemple ou en utilisant ces valeurs par défaut :
   ```env
   PORT=3000
   JWT_SECRET=super_secret_dungeon_key_change_me
   DATABASE_URL=postgresql://admin:password123@localhost:5432/dungeon_desk_db?schema=public
   ```

## Lancement (Backend)

Le backend est configuré pour se connecter à une base de données **Neon** (via le fichier `.env`).

### Via Docker (Recommandé)
Pour lancer le serveur backend en tâche de fond :
```bash
docker compose up -d
```
L'API sera accessible sur `http://localhost:3000`.

### Via Node.js (Développement)
Pour lancer le serveur en local avec rechargement automatique :
```bash
npm install
npm run dev
```

## Base de données (Prisma)
Les migrations sont gérées via Prisma et Neon.
Pour voir l'état de la base ou appliquer des changements manuels :
```bash
npx prisma studio
```


**Générer le client Prisma :**
```bash
npx prisma generate
```

## Commandes Utiles

- **Accéder au studio Prisma (Interface graphique pour voir la BDD) :**
  ```bash
  npx prisma studio
  ```
  Accessible ensuite sur `http://localhost:5555`.

- **Créer une migration après modification du fichier `prisma/schema.prisma` :**
  ```bash
  npx prisma migrate dev --name nom_de_la_migration
  ```
