import { Response } from 'express';

// Données de jeu publiques : fraîches pendant maxAge secondes, puis servies
// telles quelles par le navigateur pendant un jour encore, le temps qu'il
// vérifie en arrière-plan s'il y a du nouveau (ETag d'Express : 304 si rien
// n'a changé). La page s'affiche sans attendre le réseau.
const STALE_WHILE_REVALIDATE = 86400;

export function setCache(res: Response, maxAge = 3600) {
  res.set('Cache-Control', `public, max-age=${maxAge}, stale-while-revalidate=${STALE_WHILE_REVALIDATE}`);
}
