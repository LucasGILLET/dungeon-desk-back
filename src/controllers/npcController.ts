import { Request, Response } from 'express';
import prisma from '../prismaClient';
import { AuthRequest } from '../middleware/authMiddleware';

export const createNpc = async (req: AuthRequest, res: Response) => {
  try {
    const { name, race, class: className, data } = req.body;
    const userId = req.user.id;

    if (!name || !race || !data) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

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
    console.error(error);
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
    console.error(error);
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
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
};

export const deleteNpc = async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;
  
      const npc = await prisma.npc.findFirst({
        where: { id: Number(id), userId },
      });
  
      if (!npc) {
        return res.status(404).json({ message: 'NPC not found' });
      }
  
      await prisma.npc.delete({
        where: { id: Number(id) },
      });
  
      res.json({ message: 'NPC deleted successfully' });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error' });
    }
  };
