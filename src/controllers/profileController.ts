import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { AuthRequest } from '../middleware/authMiddleware';
import { profileInputSchema } from '../validators/profileValidator';
import { logger } from '../utils/logger';

// Profil de l'utilisateur connecté (pseudo affiché dans les campagnes)

const PROFILE_SELECT = { id: true, username: true, email: true, createdAt: true } as const;
const TAKEN = { message: 'Ce pseudo est déjà pris', errors: [{ path: 'username', message: 'Ce pseudo est déjà pris' }] };

export const getProfile = async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user.id;
  try {
    const profile = await prisma.user.findUnique({ where: { id: userId }, select: PROFILE_SELECT });
    if (!profile) return res.status(404).json({ message: 'User not found' });
    res.json(profile);
  } catch (error) {
    logger.error(`Error reading profile: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const userId = (req as AuthRequest).user.id;
  const parsed = profileInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ message: 'Invalid profile data', errors: parsed.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })) });
  }
  const { username } = parsed.data;
  try {
    // « Gandalf » et « gandalf » seraient confondus par les autres joueurs
    const taken = await prisma.user.findFirst({ where: { username: { equals: username, mode: 'insensitive' }, NOT: { id: userId } }, select: { id: true } });
    if (taken) return res.status(409).json(TAKEN);
    const profile = await prisma.user.update({ where: { id: userId }, data: { username }, select: PROFILE_SELECT });
    res.json(profile);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return res.status(409).json(TAKEN);
    logger.error(`Error updating profile: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
