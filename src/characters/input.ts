// Format d'échange d'un personnage (création, mise à jour, lecture).
// Les données de jeu sont désignées par leur index ("wizard", "elvish") ; les
// choix, options et entrées de personnalité, qui n'ont pas d'index, par leur id
// (exposé par l'API SRD).
import { z } from 'zod';

const index = z.string().trim().min(1).max(100);
const id = z.number().int().positive();
const count = z.number().int().min(0);
const longText = z.string().max(20000).nullish();

export const CURRENCIES = ['CP', 'SP', 'EP', 'GP', 'PP'] as const;
export const PERSONALITY_KINDS = ['PERSONALITY_TRAIT', 'IDEAL', 'BOND', 'FLAW'] as const;

const LevelSchema = z.object({
  level: z.number().int().min(1).max(20), // niveau dans la classe
  characterLevel: z.number().int().min(1).max(20), // ordre de prise, tous niveaux confondus
  hitPointRoll: z.number().int().min(1).nullish(), // null = valeur moyenne
  // Amélioration de caractéristiques : un don, ou des augmentations (+2, ou +1/+1)
  feat: index.nullish(),
  abilityIncreases: z.array(z.object({ ability: index, bonus: z.union([z.literal(1), z.literal(2)]) })).default([]),
});

export const CharacterInputSchema = z.object({
  edition: index.default('2014'),
  name: z.string().trim().min(1).max(100),
  race: index,
  subrace: index.nullish(),
  background: index.nullish(),
  alignment: index.nullish(),

  abilityMethod: z.enum(['STANDARD_ARRAY', 'POINT_BUY', 'ROLLED', 'MANUAL']).default('MANUAL'),
  // Valeurs de base, avant bonus : { str: 15, dex: 14, … }
  abilityScores: z.record(index, z.number().int().min(1).max(30)),

  // Dans l'ordre de prise : la première est la classe de départ
  classes: z.array(z.object({
    class: index,
    subclass: index.nullish(),
    hitDiceUsed: count.default(0),
    levels: z.array(LevelSchema).min(1).max(20),
  })).min(1).max(20),

  // Réponses aux choix : une option listée, ou une langue / un objet de la réserve
  choices: z.array(z.object({
    choiceId: id,
    optionId: id.nullish(),
    language: index.nullish(),
    equipment: index.nullish(),
  })).default([]),

  spells: z.array(z.object({ spell: index, class: index, prepared: z.boolean().default(false) })).default([]),

  items: z.array(z.object({
    equipment: index.nullish(),
    name: z.string().trim().min(1).max(200).nullish(),
    description: longText,
    quantity: count.default(1),
    equipped: z.boolean().default(false),
    attuned: z.boolean().default(false),
  })).default([]),
  currencies: z.partialRecord(z.enum(CURRENCIES), count).default({}),

  personality: z.array(z.object({
    kind: z.enum(PERSONALITY_KINDS),
    optionId: id.nullish(),
    text: z.string().trim().min(1).max(2000).nullish(),
  })).default([]),

  conditions: z.array(index).default([]),
  state: z.object({
    experiencePoints: count.default(0),
    currentHitPoints: count.nullish(), // null = PV au maximum
    temporaryHitPoints: count.default(0),
    deathSaveSuccesses: z.number().int().min(0).max(3).default(0),
    deathSaveFailures: z.number().int().min(0).max(3).default(0),
    inspiration: z.boolean().default(false),
    spellSlotsUsed: z.array(z.object({ level: z.number().int().min(1).max(9), pact: z.boolean().default(false), used: count })).default([]),
    featureUsage: z.array(z.object({ feature: index.nullish(), trait: index.nullish(), used: count })).default([]),
  }).prefault({}),

  appearance: longText,
  backstory: longText,
  notes: longText,
  portraitUrl: z.string().url().max(2000).nullish(),
});

export type CharacterInput = z.infer<typeof CharacterInputSchema>;
