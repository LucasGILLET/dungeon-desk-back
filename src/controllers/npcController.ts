import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { AuthRequest } from '../middleware/authMiddleware';
import { createNpcSchema } from '../validators/npcValidator';
import { logger } from '../utils/logger';

export const createNpc = async (req: AuthRequest, res: Response) => {
  try {
    const result = createNpcSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: 'Invalid NPC data',
        errors: result.error.format()
      });
    }

    const { name, race, class: className, data } = result.data;
    const userId = req.user.id;

    const newNpc = await prisma.npc.create({
      data: {
        name,
        race,
        class: className || null,
        data,
        userId,
      },
    });

    res.status(201).json(newNpc);
  } catch (error) {
    logger.error(`Error creating NPC: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getNpcs = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user.id;

    const npcs = await prisma.npc.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(npcs);
  } catch (error) {
    logger.error(`Error fetching NPCs: ${error instanceof Error ? error.message : error}`);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getNpcById = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const npc = await prisma.npc.findFirst({
        where: {
            id: Number(id),
            userId
        },
      });

      if (!npc) {
        return res.status(404).json({ message: 'NPC not found' });
      }

      res.json(npc);
    } catch (error) {
      logger.error(`Error fetching NPC: ${error instanceof Error ? error.message : error}`);
      res.status(500).json({ message: 'Server error' });
    }
};

export const deleteNpc = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const deleted = await prisma.npc.deleteMany({
        where: { id: Number(id), userId },
      });

      if (deleted.count === 0) {
        return res.status(404).json({ message: 'NPC not found' });
      }

      res.json({ message: 'NPC deleted successfully' });
    } catch (error) {
      logger.error(`Error deleting NPC: ${error instanceof Error ? error.message : error}`);
      res.status(500).json({ message: 'Server error' });
    }
  };
