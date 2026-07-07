import { Request, Response, NextFunction } from 'express';

// Vérifie que :id est bien un entier positif avant d'atteindre le contrôleur.
// Sans ça, `Number(id)` sur un id invalide (ex: "abc") donne NaN, qui atterrit
// tel quel dans une requête Prisma.
export function validateIdParam(req: Request, res: Response, next: NextFunction) {
  const { id } = req.params;

  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ message: 'Invalid id parameter' });
  }

  next();
}
