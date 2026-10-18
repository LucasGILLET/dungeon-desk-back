// PNJ au format d'échange (voir src/validators/npcValidator.ts)
const nullableString = { type: 'string', nullable: true } as const;

export const npcInputSchema = {
  type: 'object',
  required: ['name', 'race'],
  properties: {
    edition: { type: 'string', default: '2014' },
    name: { type: 'string', example: 'Bardryn Rumnaheim' },
    firstName: nullableString,
    lastName: nullableString,
    race: { type: 'string', example: 'dwarf' },
    subrace: nullableString,
    class: { type: 'string', nullable: true, description: 'null = roturier' },
    alignment: { type: 'string', nullable: true, example: 'lawful-good' },
    gender: { type: 'string', nullable: true, enum: ['MALE', 'FEMALE', 'NON_BINARY'] },
    age: { type: 'integer', nullable: true },
    heightCm: { type: 'integer', nullable: true },
    weightKg: { type: 'integer', nullable: true },
    bodyType: nullableString,
    profession: nullableString,
    socialStatus: nullableString,
    relations: nullableString,
    personality: nullableString,
    motivation: nullableString,
    quirk: nullableString,
    history: nullableString,
    notes: nullableString,
    abilityScores: { type: 'object', additionalProperties: { type: 'integer' }, example: { str: 11, dex: 10, con: 12, int: 12, wis: 13, cha: 16 } },
  },
} as const;

export const npcSchema = {
  allOf: [
    { $ref: '#/components/schemas/NpcInput' },
    {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        names: {
          type: 'object',
          description: 'Noms traduits',
          properties: { race: nullableString, subrace: nullableString, class: nullableString, alignment: nullableString },
        },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  ],
} as const;
