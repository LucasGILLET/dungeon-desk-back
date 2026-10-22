import { Router } from 'express';
import {
  addGmCharacter, campaignNpcs, createCampaign, deleteCampaign, encounters, getCampaign, getCampaigns, getInvite, joinCampaign, quests, regenerateInvite,
  removeGmCharacter, removeMember, sessions, updateCampaign, updateMembership,
} from '../controllers/campaignController';
import { protect } from '../middleware/authMiddleware';

const router = Router();

router.use(protect); // Toutes les routes nécessitent d'être connecté

/**
 * @swagger
 * tags:
 *   name: Campaigns
 *   description: Campaigns of a game master (sessions, quests, NPCs, encounters) and the players invited to them
 */

/**
 * @swagger
 * /campaigns:
 *   get:
 *     summary: Campaigns of the user, as game master or as player
 *     operationId: getCampaigns
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Campaign summaries with the role of the user }
 *   post:
 *     summary: Create a campaign (the user is its game master)
 *     operationId: createCampaign
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     requestBody: { required: true, content: { application/json: { schema: { type: object } } } }
 *     responses:
 *       201: { description: Created }
 *       400: { description: Invalid data }
 */
router.get('/', getCampaigns);
router.post('/', createCampaign);

/**
 * @swagger
 * /campaigns/invite/{code}:
 *   get:
 *     summary: Campaign behind an invitation link
 *     operationId: getCampaignInvite
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: code, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Campaign preview }
 *       404: { description: Unknown or regenerated link }
 * /campaigns/invite/{code}/join:
 *   post:
 *     summary: Join a campaign with one of the user's characters
 *     operationId: joinCampaign
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: code, required: true, schema: { type: string } }
 *     requestBody: { content: { application/json: { schema: { type: object, properties: { characterId: { type: integer, nullable: true } } } } } }
 *     responses:
 *       201: { description: Joined }
 *       404: { description: Unknown or regenerated link }
 */
router.get('/invite/:code', getInvite);
router.post('/invite/:code/join', joinCampaign);

/**
 * @swagger
 * /campaigns/{id}:
 *   get:
 *     summary: Campaign, filtered by role (players do not see GM notes, NPCs, encounters or hidden quests)
 *     operationId: getCampaign
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Campaign }
 *       404: { description: Not found or not accessible }
 *   put:
 *     summary: Update a campaign (game master)
 *     operationId: updateCampaign
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody: { required: true, content: { application/json: { schema: { type: object } } } }
 *     responses:
 *       200: { description: Updated }
 *       403: { description: Not the game master }
 *   delete:
 *     summary: Delete a campaign (game master)
 *     operationId: deleteCampaign
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Deleted }
 *       403: { description: Not the game master }
 */
router.get('/:id', getCampaign);
router.put('/:id', updateCampaign);
router.delete('/:id', deleteCampaign);

/**
 * @swagger
 * /campaigns/{id}/invite:
 *   post:
 *     summary: Regenerate the invitation link (the previous one stops working)
 *     operationId: regenerateCampaignInvite
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: New invitation code }
 * /campaigns/{id}/membership:
 *   put:
 *     summary: Change the character the user plays in the campaign
 *     operationId: updateCampaignMembership
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Updated }
 * /campaigns/{id}/members/{userId}:
 *   delete:
 *     summary: Remove a player (game master) or leave the campaign (the player)
 *     operationId: removeCampaignMember
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: path, name: userId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Removed }
 * /campaigns/{id}/gm-characters:
 *   post:
 *     summary: Add one of the game master's characters to the party
 *     operationId: addCampaignGmCharacter
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       201: { description: Added }
 * /campaigns/{id}/gm-characters/{characterId}:
 *   delete:
 *     summary: Remove a game master's character from the party
 *     operationId: removeCampaignGmCharacter
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: path, name: characterId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Removed }
 */
router.post('/:id/invite', regenerateInvite);
router.put('/:id/membership', updateMembership);
router.delete('/:id/members/:userId', removeMember);
router.post('/:id/gm-characters', addGmCharacter);
router.delete('/:id/gm-characters/:characterId', removeGmCharacter);

/**
 * @swagger
 * /campaigns/{id}/{collection}:
 *   post:
 *     summary: Add a session, quest, NPC or encounter (game master)
 *     operationId: createCampaignItem
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: path, name: collection, required: true, schema: { type: string, enum: [sessions, quests, npcs, encounters] } }
 *     requestBody: { required: true, content: { application/json: { schema: { type: object } } } }
 *     responses:
 *       201: { description: Created }
 * /campaigns/{id}/{collection}/{childId}:
 *   put:
 *     summary: Update a session, quest, NPC or encounter (game master)
 *     operationId: updateCampaignItem
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: path, name: collection, required: true, schema: { type: string, enum: [sessions, quests, npcs, encounters] } }
 *       - { in: path, name: childId, required: true, schema: { type: integer } }
 *     requestBody: { required: true, content: { application/json: { schema: { type: object } } } }
 *     responses:
 *       200: { description: Updated }
 *   delete:
 *     summary: Delete a session, quest, NPC or encounter (game master)
 *     operationId: deleteCampaignItem
 *     tags: [Campaigns]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *       - { in: path, name: collection, required: true, schema: { type: string, enum: [sessions, quests, npcs, encounters] } }
 *       - { in: path, name: childId, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Deleted }
 */
for (const [path, handlers] of [['sessions', sessions], ['quests', quests], ['npcs', campaignNpcs], ['encounters', encounters]] as const) {
  router.post(`/:id/${path}`, handlers.create);
  router.put(`/:id/${path}/:childId`, handlers.update);
  router.delete(`/:id/${path}/:childId`, handlers.remove);
}

export default router;
