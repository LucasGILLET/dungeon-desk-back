import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';

// À placer après `protect` : vérifie le rôle de l'utilisateur dans le back-office.
export const requireRole = (...roles: UserRole[]) => (req: Request, res: Response, next: NextFunction) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  next();
};

// Rôles qui peuvent ouvrir le back-office (lecture et traductions)
export const BACKOFFICE_ROLES: UserRole[] = ['TRANSLATOR', 'EDITOR', 'ADMIN'];
// Rôles qui peuvent modifier le contenu lui-même (pas seulement les traductions)
export const CONTENT_ROLES: UserRole[] = ['EDITOR', 'ADMIN'];
