import { Router } from 'express';
import { createNpc, getNpcs, getNpcById, deleteNpc, updateNpc } from '../controllers/npcController';
import { protect } from '../middleware/authMiddleware';
import { validateIdParam } from '../middleware/validateIdParam';

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
 *     summary: Create an NPC
 *     operationId: postNpcs
 *     tags: [NPCs]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NpcInput'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Npc'
 */
router.post('/', createNpc);

/**
 * @swagger
 * /npcs:
 *   get:
 *     summary: List the NPCs of the current user
 *     operationId: getNpcs
 *     tags: [NPCs]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Npc'
 */
router.get('/', getNpcs);

/**
 * @swagger
 * /npcs/{id}:
 *   get:
 *     summary: Get an NPC
 *     operationId: getNpcById
 *     tags: [NPCs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Npc'
 */
router.get('/:id', validateIdParam, getNpcById);

/**
 * @swagger
 * /npcs/{id}:
 *   put:
 *     summary: Update an NPC
 *     operationId: updateNpc
 *     tags: [NPCs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/NpcInput'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Npc'
 */
router.put('/:id', validateIdParam, updateNpc);

/**
 * @swagger
 * /npcs/{id}:
 *   delete:
 *     summary: Delete an NPC
 *     operationId: deleteNpc
 *     tags: [NPCs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 */
router.delete('/:id', validateIdParam, deleteNpc);

export default router;
