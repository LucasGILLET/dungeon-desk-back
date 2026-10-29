import { Request, Response, NextFunction } from 'express';
import prisma from '../prismaClient';
import { checkJwt } from './authMiddleware';

// Connexion facultative (recherche) : sans jeton ou avec un jeton invalide, la
// requête continue en anonyme ; l'utilisateur n'est jamais créé ici
export const optionalUser = (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers.authorization) return next();
  checkJwt(req, res, async () => {
    const auth0Id = req.auth?.payload.sub;
    if (auth0Id) req.user = (await prisma.user.findUnique({ where: { auth0Id } }).catch(() => null)) ?? undefined;
    next();
  });
};
