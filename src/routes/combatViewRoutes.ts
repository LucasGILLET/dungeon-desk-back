import { Router } from 'express';
import { getCombatView } from '../controllers/combatController';

// Vue des joueurs d'un combat : publique, par le lien que partage le MJ
const router = Router();

/**
 * @swagger
 * /combat-view/{code}:
 *   get:
 *     summary: Players' view of a shared combat (initiative order, turn, health of the game master's creatures without their stats)
 *     operationId: getCombatView
 *     tags: [Campaigns]
 *     parameters:
 *       - { in: path, name: code, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Censored combat }
 *       404: { description: Unknown or no longer shared }
 */
router.get('/:code', getCombatView);

export default router;
