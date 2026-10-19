import { z } from 'zod';

// Campagnes et leur contenu : textes libres (Markdown pour les champs longs),
// monstres des rencontres désignés par leur index, comme dans les personnages.
const title = z.string().trim().min(1).max(200);
const short = z.string().trim().max(500).nullish();
const long = z.string().max(50000).nullish();
const id = z.number().int().positive();

export const campaignInputSchema = z.object({
  edition: z.string().trim().min(1).max(100).default('2014'),
  name: title,
  description: long,
  theme: short,
  status: z.enum(['PREPARATION', 'ACTIVE', 'PAUSED', 'FINISHED']).default('PREPARATION'),
});

export const sessionInputSchema = z.object({
  // Absent : séance suivante
  number: z.number().int().min(1).max(10000).optional(),
  playedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date attendue : AAAA-MM-JJ').nullish(),
  title: short,
  summary: long,
  gmNotes: long,
});

export const questInputSchema = z.object({
  title,
  description: long,
  status: z.enum(['ACTIVE', 'COMPLETED', 'FAILED', 'PAUSED']).default('ACTIVE'),
  difficulty: z.enum(['EASY', 'MEDIUM', 'HARD', 'DEADLY']).nullish(),
  reward: short,
  giverNpcId: id.nullish(),
  revealed: z.boolean().default(false),
  position: z.number().int().min(0).optional(),
});

export const campaignNpcInputSchema = z.object({
  npcId: id,
  role: short,
  location: short,
  notes: long,
});

export const encounterInputSchema = z.object({
  name: title,
  description: long,
  status: z.enum(['PLANNED', 'DONE']).default('PLANNED'),
  sessionId: id.nullish(),
  position: z.number().int().min(0).optional(),
  monsters: z.array(z.object({ monster: z.string().trim().min(1).max(100), count: z.number().int().min(1).max(100) })).max(50).default([]),
});

// Rejoindre une campagne, ou changer de personnage
export const membershipInputSchema = z.object({ characterId: id.nullish() });

export type CampaignInput = z.infer<typeof campaignInputSchema>;
export type SessionInput = z.infer<typeof sessionInputSchema>;
export type QuestInput = z.infer<typeof questInputSchema>;
export type CampaignNpcInput = z.infer<typeof campaignNpcInputSchema>;
export type EncounterInput = z.infer<typeof encounterInputSchema>;
