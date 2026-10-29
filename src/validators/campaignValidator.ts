import { z } from 'zod';

// Campagnes et leur contenu : textes libres (Markdown pour les champs longs),
// monstres des rencontres désignés par leur index, comme dans les personnages.
const title = z.string().trim().min(1).max(200);
const short = z.string().trim().max(500).nullish();
const long = z.string().max(50000).nullish();
const id = z.number().int().positive();
// PNJ de la campagne (id de CampaignNpc) liés à une séance ou une quête ; absent : inchangés
const campaignNpcIds = z.array(id).max(100).optional();

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
  campaignNpcIds,
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
  campaignNpcIds,
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
export const gmCharacterInputSchema = z.object({ characterId: id });

export type EncounterInput = z.infer<typeof encounterInputSchema>;

// Gestionnaire de combat : création (depuis une rencontre ou vide), puis état
// complet renvoyé à chaque changement (ordre du tableau = ordre d'initiative)
export const combatCreateSchema = z.object({
  name: title.optional(),
  encounterId: id.nullish(),
});

const hp = z.number().int().min(0).max(10000);
export const combatStateSchema = z.object({
  name: title,
  round: z.number().int().min(1).max(10000),
  turn: z.number().int().min(0).max(500),
  finished: z.boolean().default(false),
  combatants: z.array(z.object({
    kind: z.enum(['CHARACTER', 'MONSTER', 'OTHER']),
    characterId: id.nullish(),
    monster: z.string().trim().min(1).max(100).nullish(),
    name: z.string().trim().min(1).max(120),
    initiative: z.number().int().min(-20).max(100).nullish(),
    initiativeBonus: z.number().int().min(-20).max(40).default(0),
    armorClass: z.number().int().min(0).max(60).nullish(),
    maxHitPoints: z.number().int().min(1).max(10000).nullish(),
    hitPoints: hp.nullish(),
    tempHitPoints: hp.default(0),
    // Personnage : PV reçus du serveur au dernier chargement. Seuls les PV que le MJ
    // a changés depuis sont reportés sur la fiche (sinon la fiche, peut-être plus
    // récente, l'emporte)
    syncedHitPoints: hp.nullish(),
    syncedTempHitPoints: hp.nullish(),
    conditions: z.array(z.string().trim().min(1).max(100)).max(20).default([]),
    note: short,
    hidden: z.boolean().default(false),
  })).max(100),
});

export type CombatState = z.infer<typeof combatStateSchema>;
