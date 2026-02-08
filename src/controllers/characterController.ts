import { Request, Response } from 'express';
import prisma from '../prismaClient';

// Create a new Character
export const createCharacter = async (req: Request, res: Response) => {
    try {
        const { name, race, class: charClass, level, data } = req.body;
        // @ts-ignore
        const userId = req.user?.id; 

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const character = await prisma.character.create({
            data: {
                name,
                race,
                class: charClass,
                level,
                data,
                userId
            }
        });


        res.status(201).json(character);
    } catch (error) {
        console.error('Error creating character:', error);
        res.status(500).json({ message: 'Error creating character' });
    }
};

// Get all characters for the logged-in user
export const getCharacters = async (req: Request, res: Response) => {
    try {
        // @ts-ignore
        const userId = req.user?.id;

        if (!userId) {
             return res.status(401).json({ message: 'Unauthorized' });
        }

        const characters = await prisma.character.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });

        res.json(characters);
    } catch (error) {
        console.error('Error fetching characters:', error);
        res.status(500).json({ message: 'Error fetching characters' });
    }
};

// Get a single character
export const getCharacter = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user?.id;

        const character = await prisma.character.findFirst({
            where: { 
                id: Number(id),
                userId 
            }
        });

        if (!character) {
            return res.status(404).json({ message: 'Character not found' });
        }

        res.json(character);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching character' });
    }
};

// Delete a character
export const deleteCharacter = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        // @ts-ignore
        const userId = req.user?.id;

        const character = await prisma.character.deleteMany({ // deleteMany ensures we check userId safely
            where: {
                id: Number(id),
                userId
            }
        });

        if (character.count === 0) {
            return res.status(404).json({ message: 'Character not found' });
        }

        res.json({ message: 'Character deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting character' });
    }
};

// Update a character
export const updateCharacter = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, race, class: charClass, level, data } = req.body;
        // @ts-ignore
        const userId = req.user?.id;

        const character = await prisma.character.findFirst({
            where: { 
                id: Number(id),
                userId 
            }
        });

        if (!character) {
             return res.status(404).json({ message: 'Character not found' });
        }

        const updatedCharacter = await prisma.character.update({
            where: { id: Number(id) },
            data: {
                name,
                race,
                class: charClass,
                level,
                data
            }
        });

        res.json(updatedCharacter);
    } catch (error) {
        console.error('Error updating character:', error);
        res.status(500).json({ message: 'Error updating character' });
    }
};
