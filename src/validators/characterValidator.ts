import { z } from 'zod';

const AbilitySchema = z.object({
  str: z.number().int().min(1).max(30),
  dex: z.number().int().min(1).max(30),
  con: z.number().int().min(1).max(30),
  int: z.number().int().min(1).max(30),
  wis: z.number().int().min(1).max(30),
  cha: z.number().int().min(1).max(30),
});

const ResourceSchema = z.object({
    index: z.string(),
    name: z.string(),
    url: z.string().optional(),
}).passthrough();

export const CharacterDataSchema = z.object({
  abilities: AbilitySchema,
  background: z.any(), 
  features: z.array(z.any()), 
  proficiencies: z.object({
    skills: z.array(z.string()),
    languages: z.array(z.string()),
    tools: z.array(z.string()).optional(),
  }).passthrough(),
  race: ResourceSchema,
  class: ResourceSchema,
  subrace: ResourceSchema.optional().nullable(),
  subclass: ResourceSchema.optional().nullable(),
  vision: z.string().optional(),
}).passthrough();

export const createCharacterSchema = z.object({
  name: z.string().min(1),
  level: z.number().int().min(1).max(20),
  data: CharacterDataSchema,
});
