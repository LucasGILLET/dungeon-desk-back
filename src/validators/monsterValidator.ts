import { z } from 'zod';
import { DiceSchema, MonsterSpeedsSchema, SensesSchema } from '../srd/jsonb';

// Monstre maison : un bloc de statistiques saisi par son auteur. Les bornes
// reprennent les contraintes CHECK de la base (Monster_stats, MonsterAction_save).

const index = z.string().trim().min(1).max(100);
const text = (max: number) => z.string().trim().max(max);
const score = z.number().int().min(1).max(30);
const bonus = z.number().int().min(-10).max(30);
const feet = z.number().int().min(0).max(10000);

// Facteurs de puissance et XP (Guide du maître 2014)
export const CR_XP: Record<string, number> = {
  0: 10, 0.125: 25, 0.25: 50, 0.5: 100, 1: 200, 2: 450, 3: 700, 4: 1100, 5: 1800, 6: 2300, 7: 2900, 8: 3900, 9: 5000, 10: 5900,
  11: 7200, 12: 8400, 13: 10000, 14: 11500, 15: 13000, 16: 15000, 17: 18000, 18: 20000, 19: 22000, 20: 25000,
  21: 33000, 22: 41000, 23: 50000, 24: 62000, 25: 75000, 26: 90000, 27: 105000, 28: 120000, 29: 135000, 30: 155000,
};

const actionSchema = z.object({
  name: text(120).min(1),
  description: text(5000).default(''),
  // Attaque : bonus au toucher, allonge ou portée
  attack: z.object({
    type: z.enum(['MELEE_WEAPON', 'RANGED_WEAPON', 'MELEE_OR_RANGED_WEAPON', 'MELEE_SPELL', 'RANGED_SPELL']),
    bonus,
    reachFt: feet.nullish(),
    rangeFt: z.object({ normal: feet, long: feet.nullish() }).nullish(),
  }).nullish(),
  save: z.object({ ability: index, dc: z.number().int().min(1).max(40) }).nullish(),
  damages: z.array(z.object({ dice: DiceSchema, damageType: index })).max(6).default([]),
  // Actions légendaires : coût de 1 à 3
  legendaryCost: z.number().int().min(1).max(3).nullish(),
});

// Résistance, immunité ou vulnérabilité ; nonMagicalOnly : seulement contre les
// attaques non magiques (« contondant, perforant et tranchant d'attaques non
// magiques »). Un simple index reste accepté.
const damageModifier = z.union([
  index.transform((damageType) => ({ damageType, nonMagicalOnly: false })),
  z.object({ damageType: index, nonMagicalOnly: z.boolean().default(false) }),
]);

export const homebrewMonsterSchema = z.object({
  name: text(120).min(1),
  description: text(20000).nullish(),
  size: z.enum(['TINY', 'SMALL', 'MEDIUM', 'LARGE', 'HUGE', 'GARGANTUAN']),
  type: index,
  // null : sans alignement
  alignment: index.nullish(),
  armorClass: z.object({ value: z.number().int().min(0).max(40), note: text(200).nullish() }),
  hitDice: z.object({
    count: z.number().int().min(1).max(100),
    size: z.number().int().refine((n) => [4, 6, 8, 10, 12, 20].includes(n), 'Dé de vie : d4, d6, d8, d10, d12 ou d20'),
    bonus: z.number().int().min(-500).max(2000).default(0),
  }),
  // Absent : moyenne des dés de vie
  hitPoints: z.number().int().min(1).max(5000).nullish(),
  speeds: MonsterSpeedsSchema,
  abilityScores: z.object({ str: score, dex: score, con: score, int: score, wis: score, cha: score }),
  savingThrows: z.array(z.object({ ability: index, bonus })).max(6).default([]),
  skills: z.array(z.object({ skill: index, bonus })).max(18).default([]),
  damageVulnerabilities: z.array(damageModifier).max(13).default([]),
  damageResistances: z.array(damageModifier).max(13).default([]),
  damageImmunities: z.array(damageModifier).max(13).default([]),
  conditionImmunities: z.array(index).max(15).default([]),
  senses: SensesSchema.default({}),
  // Absent : 10 + modificateur de Sagesse
  passivePerception: z.number().int().min(0).max(40).nullish(),
  languages: text(300).nullish(),
  challengeRating: z.number().refine((cr) => String(cr) in CR_XP, 'Facteur de puissance inconnu'),
  legendaryActionsPerRound: z.number().int().min(1).max(5).nullish(),
  traits: z.array(actionSchema).max(30).default([]),
  actions: z.array(actionSchema).max(30).default([]),
  bonusActions: z.array(actionSchema).max(15).default([]),
  reactions: z.array(actionSchema).max(15).default([]),
  legendaryActions: z.array(actionSchema).max(15).default([]),
  // Actions de repaire (à l'initiative 20, dans l'antre de la créature)
  lairActions: z.array(actionSchema).max(15).default([]),
});

export type HomebrewMonsterInput = z.infer<typeof homebrewMonsterSchema>;
export type HomebrewAction = z.infer<typeof actionSchema>;
