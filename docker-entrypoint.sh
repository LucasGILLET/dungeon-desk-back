#!/bin/sh

# Arrêter le script si une commande échoue
set -e

echo "Running migrations..."
npx prisma migrate deploy

echo "Starting server..."
exec "$@"
