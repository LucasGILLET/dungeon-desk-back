#!/bin/sh

# Arrêter le script si une commande échoue
set -e

echo "Starting server..."
exec "$@"
