import { Router } from 'express';
import { getClasses, getClassByIndex } from '../controllers/srdController';
import {
  getAbilityScores, getAlignments, getBackgrounds, getConditions, getCreationRules, getEquipment, getEquipmentByIndex, getFeats, getNpcTables, getRaces, getSkills, getSpells,
} from '../controllers/srdContentController';
import { getGuide, getGuides, getRuleChapters, getRuleSection } from '../controllers/srdGuideController';
import { getMagicItemByIndex, getMagicItems, getMonsterByIndex, getMonsters } from '../controllers/srdBestiaryController';

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
 * /srd/{edition}/equipment/{index}:
 *   get:
 *     summary: One piece of equipment with its weapon or armor stats and property rules (translated)
 *     operationId: getSrdEquipmentByIndex
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: path, name: index, required: true, schema: { type: string, example: greatsword } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: Equipment }
 *       404: { description: Unknown equipment }
 */
router.get('/:edition/equipment/:index', getEquipmentByIndex);

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

/**
 * @swagger
 * /srd/{edition}/alignments:
 *   get:
 *     summary: Alignments (translated)
 *     operationId: getSrdAlignments
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: OK }
 */
router.get('/:edition/alignments', getAlignments);

/**
 * @swagger
 * /srd/{edition}/monsters:
 *   get:
 *     summary: Monsters, summary for search and filters (translated)
 *     operationId: getSrdMonsters
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: Monster summaries }
 */
router.get('/:edition/monsters', getMonsters);

/**
 * @swagger
 * /srd/{edition}/monsters/{index}:
 *   get:
 *     summary: Monster stat block (structured fields, distances in feet)
 *     operationId: getSrdMonster
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: path, name: index, required: true, schema: { type: string, example: aboleth } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: Monster stat block }
 *       404: { description: Not found }
 */
router.get('/:edition/monsters/:index', getMonsterByIndex);

/**
 * @swagger
 * /srd/{edition}/magic-items:
 *   get:
 *     summary: Magic items, without description (translated)
 *     operationId: getSrdMagicItems
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: Magic items }
 */
router.get('/:edition/magic-items', getMagicItems);

/**
 * @swagger
 * /srd/{edition}/magic-items/{index}:
 *   get:
 *     summary: Magic item with its description and variants
 *     operationId: getSrdMagicItem
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: path, name: index, required: true, schema: { type: string, example: bag-of-holding } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: Magic item with its description and variants }
 *       404: { description: Not found }
 */
router.get('/:edition/magic-items/:index', getMagicItemByIndex);

/**
 * @swagger
 * /srd/{edition}/rule-chapters:
 *   get:
 *     summary: SRD rules table of contents (chapters and section names)
 *     operationId: getSrdRuleChapters
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: OK }
 */
router.get('/:edition/rule-chapters', getRuleChapters);

/**
 * @swagger
 * /srd/{edition}/rule-sections/{index}:
 *   get:
 *     summary: SRD rule section (Markdown)
 *     operationId: getSrdRuleSection
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: path, name: index, required: true, schema: { type: string, example: cover } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get('/:edition/rule-sections/:index', getRuleSection);

/**
 * @swagger
 * /srd/{edition}/guides:
 *   get:
 *     summary: Published guide pages of the application
 *     operationId: getSrdGuides
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: OK }
 */
router.get('/:edition/guides', getGuides);

/**
 * @swagger
 * /srd/{edition}/guides/{index}:
 *   get:
 *     summary: Guide page with its sections and cards
 *     operationId: getSrdGuide
 *     tags: [SRD]
 *     parameters:
 *       - { in: path, name: edition, required: true, schema: { type: string, example: '2014' } }
 *       - { in: path, name: index, required: true, schema: { type: string, example: classes } }
 *       - { in: query, name: lang, schema: { type: string, example: fr } }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get('/:edition/guides/:index', getGuide);

export default router;
