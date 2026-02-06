import { Router } from 'express';
import { createNpc, getNpcs, getNpcById, deleteNpc } from '../controllers/npcController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect); // Toutes les routes nécessitent d'être connecté

/**
 * @swagger
 * tags:
 *   name: NPCs
 *   description: Non-Player Character management
 */

/**
 * @swagger
 * /npcs:
 *   post:
 *     summary: Create a new NPC
 *     tags: [NPCs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               race:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: The created NPC
 */
router.post('/', createNpc);

/**
 * @swagger
 * /npcs:
 *   get:
 *     summary: Get all NPCs for the current user
 *     tags: [NPCs]
 *     responses:
 *       200:
 *         description: List of NPCs
 */
router.get('/', getNpcs);

/**
 * @swagger
 * /npcs/{id}:
 *   get:
 *     summary: Get an NPC by ID
 *     tags: [NPCs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: NPC details
 *       404:
 *         description: NPC not found
 */
router.get('/:id', getNpcById);

router.delete('/:id', deleteNpc);

export default router;
