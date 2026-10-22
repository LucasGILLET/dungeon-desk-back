import express from 'express';
import {
  copySharedCharacter, createCharacter, getCharacters, getCharacter, getSharedCharacter, deleteCharacter, updateCharacter, previewCharacter, shareCharacter,
} from '../controllers/characterController';
import { protect } from '../middleware/authMiddleware';
import { validateIdParam } from '../middleware/validateIdParam';

const router = express.Router();

/**
 * @swagger
 * /characters/preview:
 *   post:
 *     summary: Preview a character without saving it (computed sheet, available choices, starting equipment)
 *     operationId: previewCharacter
 *     tags: [Characters]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: lang
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
 *         description: Preview
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CharacterPreview'
 *       400:
 *         description: Malformed character
 */
router.post('/preview', previewCharacter);

/**
 * @swagger
 * /characters/shared/{code}:
 *   get:
 *     summary: Character shared by its owner with a link (read-only, no account needed)
 *     operationId: getSharedCharacter
 *     tags: [Characters]
 *     security: []
 *     parameters:
 *       - { in: path, name: code, required: true, schema: { type: string } }
 *       - { in: query, name: lang, schema: { type: string } }
 *     responses:
 *       200: { description: Character with its computed sheet }
 *       404: { description: Unknown or no longer shared }
 * /characters/shared/{code}/copy:
 *   post:
 *     summary: Copy a shared character into the user's characters (game state reset)
 *     operationId: copySharedCharacter
 *     tags: [Characters]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: code, required: true, schema: { type: string } }
 *     responses:
 *       201: { description: Id of the new character }
 * /characters/{id}/share:
 *   post:
 *     summary: Create or renew the share link of a character (the previous one stops working)
 *     operationId: shareCharacter
 *     tags: [Characters]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Share code }
 *   delete:
 *     summary: Stop sharing a character
 *     operationId: unshareCharacter
 *     tags: [Characters]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: No longer shared }
 */
router.get('/shared/:code', getSharedCharacter);
router.post('/shared/:code/copy', protect, copySharedCharacter);

router.use(protect); // Protect all other character routes

router.post('/:id/share', validateIdParam, shareCharacter);
router.delete('/:id/share', validateIdParam, shareCharacter);

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
 *                 $ref: '#/components/schemas/CharacterSummary'
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
router.get('/:id', validateIdParam, getCharacter);

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
router.delete('/:id', validateIdParam, deleteCharacter);

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
router.put('/:id', validateIdParam, updateCharacter);

export default router;
