import { z } from 'zod';

// PNJ au format d'échange : données de jeu désignées par leur index, comme un
// personnage ; ses traits sont du texte libre (tiré par le générateur, modifiable).
const index = z.string().trim().min(1).max(100);
const text = z.string().trim().max(500).nullish();

export const npcInputSchema = z.object({
  edition: index.default('2014'),
  name: z.string().trim().min(1).max(200),
  firstName: z.string().trim().max(100).nullish(),
  lastName: z.string().trim().max(100).nullish(),
  race: index,
  subrace: index.nullish(),
  class: index.nullish(), // null = roturier
  alignment: index.nullish(),
  gender: z.enum(['MALE', 'FEMALE', 'NON_BINARY']).nullish(),
  age: z.number().int().min(0).max(10000).nullish(),
  heightCm: z.number().int().min(1).max(2000).nullish(),
  weightKg: z.number().int().min(1).max(100000).nullish(),
  bodyType: text,
  profession: text,
  socialStatus: text,
  relations: text,
  personality: text,
  motivation: text,
  quirk: text,
  history: z.string().max(20000).nullish(),
  notes: z.string().max(20000).nullish(),
  // { str: 11, dex: 10, … }
  abilityScores: z.record(index, z.number().int().min(1).max(30)).default({}),
});

export type NpcInput = z.infer<typeof npcInputSchema>;
