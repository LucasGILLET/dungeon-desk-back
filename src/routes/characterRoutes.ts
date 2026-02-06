import express from 'express';
import { createCharacter, getCharacters, getCharacter, deleteCharacter } from '../controllers/characterController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

router.use(protect); // Protect all character routes

/**
 * @swagger
 * tags:
 *   name: Characters
 *   description: Player Character management
 */

/**
 * @swagger
 * /characters:
 *   post:
 *     summary: Create a new character
 *     tags: [Characters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - race
 *               - class
 *               - level
 *             properties:
 *               name:
 *                 type: string
 *               race:
 *                 type: string
 *               class:
 *                 type: string
 *               level:
 *                 type: number
 *               data:
 *                 type: object
 *     responses:
 *       200:
 *         description: The created character
 *       401:
 *         description: Unauthorized
 */
router.post('/', createCharacter);

/**
 * @swagger
 * /characters:
 *   get:
 *     summary: Get all characters for the current user
 *     tags: [Characters]
 *     responses:
 *       200:
 *         description: List of characters
 */
router.get('/', getCharacters);

/**
 * @swagger
 * /characters/{id}:
 *   get:
 *     summary: Get a character by ID
 *     tags: [Characters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Character details
 *       404:
 *         description: Character not found
 */
router.get('/:id', getCharacter);

router.delete('/:id', deleteCharacter);

export default router;
