import { Router } from 'express';
import { getClasses, getClassByIndex } from '../controllers/srdController';
import {
  getAbilityScores, getBackgrounds, getConditions, getCreationRules, getEquipment, getFeats, getNpcTables, getRaces, getSkills, getSpells,
} from '../controllers/srdContentController';

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

/**
 * @swagger
 * /srd/{edition}/races:
 *   get:
 *     summary: Races of an edition, with their subraces and traits (translated)
 *     operationId: getSrdRaces
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: Races }
 */
router.get('/:edition/races', getRaces);

/**
 * @swagger
 * /srd/{edition}/backgrounds:
 *   get:
 *     summary: Backgrounds of an edition, with their personality tables (translated)
 *     operationId: getSrdBackgrounds
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: Backgrounds }
 */
router.get('/:edition/backgrounds', getBackgrounds);

/**
 * @swagger
 * /srd/{edition}/spells:
 *   get:
 *     summary: Spells of an edition (structured fields, distances in feet)
 *     operationId: getSrdSpells
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: Spells }
 */
router.get('/:edition/spells', getSpells);

/**
 * @swagger
 * /srd/{edition}/conditions:
 *   get:
 *     summary: Conditions (translated)
 *     operationId: getSrdConditions
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: Conditions }
 */
router.get('/:edition/conditions', getConditions);

/**
 * @swagger
 * /srd/{edition}/equipment:
 *   get:
 *     summary: Equipment catalogue, without detailed stats (translated)
 *     operationId: getSrdEquipment
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: Equipment }
 */
router.get('/:edition/equipment', getEquipment);

/**
 * @swagger
 * /srd/{edition}/feats:
 *   get:
 *     summary: Feats with their ability prerequisites (translated)
 *     operationId: getSrdFeats
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: Feats }
 */
router.get('/:edition/feats', getFeats);

/**
 * @swagger
 * /srd/{edition}/skills:
 *   get:
 *     summary: Skills with their ability score (translated)
 *     operationId: getSrdSkills
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: Skills }
 */
router.get('/:edition/skills', getSkills);

/**
 * @swagger
 * /srd/{edition}/ability-scores:
 *   get:
 *     summary: Ability scores with their short summary (translated)
 *     operationId: getAbilityScores
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: OK }
 */
router.get('/:edition/ability-scores', getAbilityScores);

/**
 * @swagger
 * /srd/{edition}/rules:
 *   get:
 *     summary: Ability score creation rules of the edition (point buy, standard array)
 *     operationId: getCreationRules
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: OK }
 */
router.get('/:edition/rules', getCreationRules);

/**
 * @swagger
 * /srd/{edition}/npc-tables:
 *   get:
 *     summary: NPC generator tables, by kind (translated)
 *     operationId: getNpcTables
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: OK }
 */
router.get('/:edition/npc-tables', getNpcTables);

export default router;
