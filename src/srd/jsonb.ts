import { z } from 'zod';

// Schémas des colonnes JSONB du socle SRD.
// Règle : uniquement des valeurs neutres en langue (nombres, dés, index), jamais de texte.
// Chaque colonne Json du schéma Prisma indique en commentaire le schéma attendu ici.

// Notation de dés : "1d8", "2d6+5", "1d10-1", une somme "4d6+4d6" (deux types de
// dégâts, ex. Colonne de flamme) ou une valeur fixe "1".
// Le suffixe "+MOD" désigne le modificateur de caractéristique d'incantation (soins).
export const DICE_REGEX = /^(\d+d\d+|\d+)(\+\d+d\d+)*([+-]\d+)?(\+MOD)?$/;
export const DiceSchema = z.string().regex(DICE_REGEX, 'Notation de dés invalide');

const feet = z.number().int().nonnegative();

// Vitesses en pieds (races)
export const SpeedsSchema = z
  .object({
    walk: feet,
    fly: feet.optional(),
    swim: feet.optional(),
    climb: feet.optional(),
    burrow: feet.optional(),
    hover: z.boolean().optional(),
  })
  .strict();

// Tailles possibles d'une race : valeurs de l'enum Size, au moins une, sans doublon
export const SizesSchema = z
  .array(z.enum(['TINY', 'SMALL', 'MEDIUM', 'LARGE', 'HUGE', 'GARGANTUAN']))
  .min(1)
  .refine((sizes) => new Set(sizes).size === sizes.length, 'Taille en double');

// Fréquence d'utilisation (traits)
export const UsageSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('at_will') }).strict(),
  z.object({ type: z.literal('per_day'), times: z.number().int().positive() }).strict(),
  z.object({ type: z.literal('per_short_rest'), times: z.number().int().positive() }).strict(),
  z.object({ type: z.literal('per_long_rest'), times: z.number().int().positive() }).strict(),
]);

// Zone d'effet
export const AreaOfEffectSchema = z
  .object({
    type: z.enum(['cone', 'cube', 'cylinder', 'line', 'sphere', 'emanation']),
    sizeFt: feet,
  })
  .strict();

// Montée en puissance des dégâts ou des soins d'un sort.
// Clés : niveau d'emplacement ("1".."9") ou niveau de personnage ("1", "5", "11", "17").
const levelKey = z.string().regex(/^([1-9]|1\d|20)$/, 'Niveau invalide');
export const DiceScalingSchema = z
  .object({
    by: z.enum(['slot_level', 'character_level']),
    values: z.record(levelKey, DiceSchema),
  })
  .strict();

// Trait utilisable comme une action (souffle du drakéide)
export const TraitActionSchema = z
  .object({
    area: AreaOfEffectSchema.optional(),
    save: z
      .object({
        abilityIndex: z.enum(['str', 'dex', 'con', 'int', 'wis', 'cha']),
        success: z.enum(['none', 'half', 'other']),
      })
      .strict()
      .optional(),
    damageAtCharacterLevel: z.record(levelKey, DiceSchema).optional(),
    usage: UsageSchema.optional(),
  })
  .strict();

export type DiceScaling = z.infer<typeof DiceScalingSchema>;
export type Speeds = z.infer<typeof SpeedsSchema>;
export type TraitAction = z.infer<typeof TraitActionSchema>;
