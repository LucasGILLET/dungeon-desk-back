import { characterCreateInputSchema, characterLevelSchema, characterNamesSchema, characterPreviewSchema, characterSchema, characterSheetSchema, characterSummarySchema } from './character';
import { messageResponseSchema } from './common';
import { userSchema } from './user';

export const swaggerSchemas = {
  CharacterLevel: characterLevelSchema,
  CharacterCreateInput: characterCreateInputSchema,
  Character: characterSchema,
  CharacterPreview: characterPreviewSchema,
  CharacterSheet: characterSheetSchema,
  CharacterSummary: characterSummarySchema,
  CharacterNames: characterNamesSchema,
  MessageResponse: messageResponseSchema,
  User: userSchema,
} as const;
