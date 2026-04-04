import { characterCreateInputSchema, characterDataSchema, characterResourceSchema, characterSchema } from './character';
import { messageResponseSchema } from './common';
import { userSchema } from './user';

export const swaggerSchemas = {
  CharacterResource: characterResourceSchema,
  CharacterData: characterDataSchema,
  CharacterCreateInput: characterCreateInputSchema,
  Character: characterSchema,
  MessageResponse: messageResponseSchema,
  User: userSchema,
} as const;
