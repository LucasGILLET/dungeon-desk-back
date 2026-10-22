import { Router } from 'express';
import { createMonster, deleteMonster, getMonsterOptions, getMyMonster, getMyMonsters, updateMonster } from '../controllers/homebrewMonsterController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect); // Monstres maison : visibles par leur seul auteur

/**
 * @swagger
 * tags:
 *   name: Monsters
 *   description: Homebrew monsters of the user, usable in the encounters of their campaigns
 */

/**
 * @swagger
 * /monsters:
 *   get:
 *     summary: Homebrew monsters of the user (same format as the SRD bestiary)
 *     operationId: getMyMonsters
 *     tags: [Monsters]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Monster summaries }
 *   post:
 *     summary: Create a homebrew monster from a stat block
 *     operationId: createMonster
 *     tags: [Monsters]
 *     security: [{ bearerAuth: [] }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object } } } }
 *     responses:
 *       201: { description: Created, with its index }
 *       400: { description: Invalid stat block }
 * /monsters/options:
 *   get:
 *     summary: Lists for the monster form (creature types, alignments, skills, damage types, conditions, challenge ratings)
 *     operationId: getMonsterOptions
 *     tags: [Monsters]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Options }
 * /monsters/{index}:
 *   get:
 *     summary: One of the user's homebrew monsters, full stat block
 *     operationId: getMyMonster
 *     tags: [Monsters]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: index, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Monster }
 *       404: { description: Not found or not the user's }
 *   put:
 *     summary: Replace the stat block of a homebrew monster
 *     operationId: updateMonster
 *     tags: [Monsters]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: index, required: true, schema: { type: string } }
 *     requestBody: { required: true, content: { application/json: { schema: { type: object } } } }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     summary: Delete a homebrew monster (refused while an encounter uses it)
 *     operationId: deleteMonster
 *     tags: [Monsters]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: index, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Deleted }
 *       409: { description: Used in an encounter }
 */
router.get('/', getMyMonsters);
router.post('/', createMonster);
router.get('/options', getMonsterOptions);
router.get('/:index', getMyMonster);
router.put('/:index', updateMonster);
router.delete('/:index', deleteMonster);

export default router;
