import { Request, Response } from 'express';
import { resolveLang } from '../srd/lang';
import { search } from '../srd/search';
import { setCache } from '../srd/cache';
import { logger } from '../utils/logger';

// Recherche globale : sorts, monstres, objets, règles… en une seule requête
export const getSearch = async (req: Request, res: Response) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    const ctx = await resolveLang(req);
    const userId = (req as Request & { user?: { id: number } }).user?.id ?? null;
    const results = await search(req.params.edition, q, ctx, userId);
    // Avec le contenu maison : réponse propre à l'utilisateur, jamais en cache partagé
    if (userId) res.set('Cache-Control', 'private, no-store');
    else setCache(res, 600);
    res.set('Vary', 'Authorization');
    res.json(results);
  } catch (error) {
    logger.error(`Error searching SRD: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({ message: 'Server error' });
  }
};
