import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import { BACKOFFICE_ROLES, requireRole } from '../middleware/requireRole';
import {
  getAdminClass, getAdminClasses, getMe, getTranslationsTodo, saveTranslation, updateAdminClass,
} from '../controllers/adminSrdController';

const router = Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Admin
 *   description: Back-office des données de jeu (rôles TRANSLATOR, EDITOR, ADMIN)
 */

/**
 * @swagger
 * /admin/me:
 *   get:
 *     summary: Current user and back-office role
 *     tags: [Admin]
 */
router.get('/me', getMe);

router.use(requireRole(...BACKOFFICE_ROLES));

/**
 * @swagger
 * /admin/{edition}/classes:
 *   get:
 *     summary: Classes with their names per language and number of texts to translate
 *     tags: [Admin]
 */
router.get('/:edition/classes', getAdminClasses);

/**
 * @swagger
 * /admin/{edition}/classes/{index}:
 *   get:
 *     summary: Editable class with its texts per language, subclasses and features
 *     tags: [Admin]
 *   put:
 *     summary: Update a class, its translations and its features' translations (translators may only send texts)
 *     tags: [Admin]
 */
router.get('/:edition/classes/:index', getAdminClass);
router.put('/:edition/classes/:index', updateAdminClass);

/**
 * @swagger
 * /admin/{edition}/translations:
 *   get:
 *     summary: Class-domain texts missing or identical to English in a language (?locale=fr)
 *     tags: [Admin]
 */
router.get('/:edition/translations', getTranslationsTodo);

/**
 * @swagger
 * /admin/translations/{entity}/{id}/{locale}:
 *   put:
 *     summary: Create or update one translation (entity = class, subclass, classFeature, choice, spellcastingSection, classTableColumn)
 *     tags: [Admin]
 */
router.put('/translations/:entity/:id/:locale', saveTranslation);

export default router;
