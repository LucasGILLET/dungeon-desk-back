import express from 'express';
import { createCharacter, getCharacters, getCharacter, deleteCharacter, updateCharacter } from '../controllers/characterController';
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
 *     operationId: createCharacter
 *     tags: [Characters]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CharacterCreateInput'
 *     responses:
 *       201:
 *         description: The created character
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Character'
 *       401:
 *         description: Unauthorized
 */
router.post('/', createCharacter);

/**
 * @swagger
 * /characters:
 *   get:
 *     summary: Get all characters for the current user
 *     operationId: getCharacters
 *     tags: [Characters]
 *     responses:
 *       200:
 *         description: List of characters
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Character'
 */
router.get('/', getCharacters);

/**
 * @swagger
 * /characters/{id}:
 *   get:
 *     summary: Get a character by ID
 *     operationId: getCharacter
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Character'
 *       404:
 *         description: Character not found
 */
router.get('/:id', getCharacter);

/**
 * @swagger
 * /characters/{id}:
 *   delete:
 *     summary: Delete a character
 *     operationId: deleteCharacter
 *     tags: [Characters]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Character deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       404:
 *         description: Character not found
 */
router.delete('/:id', deleteCharacter);

/**
 * @swagger
 * /characters/{id}:
 *   put:
 *     summary: Update a character
 *     operationId: updateCharacter
 *     tags: [Characters]
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
 *             $ref: '#/components/schemas/CharacterCreateInput'
 *     responses:
 *       200:
 *         description: Updated character
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Character'
 *       404:
 *         description: Character not found
 */
router.put('/:id', updateCharacter);

export default router;
