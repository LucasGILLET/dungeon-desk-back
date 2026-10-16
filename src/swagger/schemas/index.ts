import { characterCreateInputSchema, characterLevelSchema, characterSchema } from './character';
import { messageResponseSchema } from './common';
import { userSchema } from './user';

export const swaggerSchemas = {
  CharacterLevel: characterLevelSchema,
  CharacterCreateInput: characterCreateInputSchema,
  Character: characterSchema,
  MessageResponse: messageResponseSchema,
  User: userSchema,
} as const;
