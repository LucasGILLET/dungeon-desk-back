#!/bin/sh

# Arrêter le script si une commande échoue
set -e

echo "Starting deployment script..."

# Optionnel : Timeout pour éviter que le déploiement ne bloque indéfiniment si la DB n'est pas dispo
# echo "Running migrations..."
# npx prisma migrate deploy || echo "Migration failed, continuing anyway..."

echo "Starting server..."
exec "$@"
