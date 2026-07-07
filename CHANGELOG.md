# Changelog

Toutes les versions notables de ce projet sont documentées dans ce fichier.

Le format s'inspire de [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/),
et ce projet suit le [Semantic Versioning](https://semver.org/lang/fr/).

> Les versions antérieures à 1.0.0 ont été reconstituées a posteriori à partir
> de l'historique Git (aucun tag n'existait avant juillet 2026) afin de
> documenter l'évolution du projet pour le dossier de certification.

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
