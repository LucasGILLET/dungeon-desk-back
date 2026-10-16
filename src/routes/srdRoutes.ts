import { Router } from 'express';
import { getClasses, getClassByIndex } from '../controllers/srdController';

const router = Router();

// Données de jeu publiques : pas d'authentification

/**
 * @swagger
 * tags:
 *   name: SRD
 *   description: Game data (classes, spells…) by edition and language
 */

/**
 * @swagger
 * /srd/{edition}/classes:
 *   get:
 *     summary: List the classes of an edition
 *     tags: [SRD]
 *     parameters:
 *       - in: path
 *         name: edition
 *         required: true
 *         schema:
 *           type: string
 *           example: "2014"
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           example: fr
 *     responses:
 *       200:
 *         description: Classes with their translated name
 */
router.get('/:edition/classes', getClasses);

/**
 * @swagger
 * /srd/{edition}/classes/{index}:
 *   get:
 *     summary: Get a class with its progression table, choices, spellcasting and features
 *     tags: [SRD]
 *     parameters:
 *       - in: path
 *         name: edition
 *         required: true
 *         schema:
 *           type: string
 *           example: "2014"
 *       - in: path
 *         name: index
 *         required: true
 *         schema:
 *           type: string
 *           example: wizard
 *       - in: query
 *         name: lang
 *         schema:
 *           type: string
 *           example: fr
 *     responses:
 *       200:
 *         description: Class details, texts in the requested language (fallback to the default language)
 *       404:
 *         description: Class not found
 */
router.get('/:edition/classes/:index', getClassByIndex);

export default router;
