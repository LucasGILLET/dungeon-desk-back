import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profileController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect);

/**
 * @swagger
 * tags:
 *   name: Profile
 *   description: Profile of the current user
 */

/**
 * @swagger
 * /me:
 *   get:
 *     summary: Profile of the current user
 *     operationId: getProfile
 *     tags: [Profile]
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *   patch:
 *     summary: Change the username shown to other players
 *     operationId: patchProfile
 *     tags: [Profile]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ProfileInput'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Profile'
 *       400: { description: Invalid username }
 *       409: { description: Username already taken }
 */
router.get('/', getProfile);
router.patch('/', updateProfile);

export default router;
