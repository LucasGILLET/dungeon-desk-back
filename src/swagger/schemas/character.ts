export const characterResourceSchema = {
  type: 'object',
  properties: {
    index: { type: 'string', nullable: true },
    name: { type: 'string', nullable: true },
    url: { type: 'string', nullable: true },
  },
} as const;

export const characterDataSchema = {
  type: 'object',
  required: ['abilities', 'background', 'features', 'race', 'class'],
  properties: {
    abilities: {
      type: 'object',
      required: ['str', 'dex', 'con', 'int', 'wis', 'cha'],
      properties: {
        str: { type: 'number', minimum: 1, maximum: 30, example: 10 },
        dex: { type: 'number', minimum: 1, maximum: 30, example: 10 },
        con: { type: 'number', minimum: 1, maximum: 30, example: 10 },
        int: { type: 'number', minimum: 1, maximum: 30, example: 10 },
        wis: { type: 'number', minimum: 1, maximum: 30, example: 10 },
        cha: { type: 'number', minimum: 1, maximum: 30, example: 10 },
      },
    },
    background: { type: 'object', additionalProperties: true },
    features: { type: 'array', items: { type: 'object' } },
    proficiencies: {
      type: 'object',
      additionalProperties: true,
      properties: {
        skills: { type: 'array', items: { type: 'string' } },
        languages: { type: 'array', items: { type: 'string' } },
        tools: { type: 'array', items: { type: 'string' } },
      },
    },
    race: { $ref: '#/components/schemas/CharacterResource' },
    class: { $ref: '#/components/schemas/CharacterResource' },
    subrace: { $ref: '#/components/schemas/CharacterResource' },
    subclass: { $ref: '#/components/schemas/CharacterResource' },
    vision: { type: 'string' },
  },
  additionalProperties: true,
} as const;

export const characterCreateInputSchema = {
  type: 'object',
  required: ['name', 'level', 'data'],
  properties: {
    name: { type: 'string', example: 'Aelar' },
    level: { type: 'integer', minimum: 1, maximum: 20, example: 1 },
    data: { $ref: '#/components/schemas/CharacterData' },
  },
} as const;

export const characterSchema = {
  type: 'object',
  required: ['id', 'name', 'race', 'class', 'level', 'data', 'userId', 'createdAt', 'updatedAt'],
  properties: {
    id: { type: 'integer', example: 1 },
    name: { type: 'string', example: 'Aelar' },
    race: { type: 'string', example: 'Elf' },
    class: { type: 'string', example: 'Wizard' },
    level: { type: 'integer', minimum: 1, maximum: 20, example: 1 },
    data: { $ref: '#/components/schemas/CharacterData' },
    userId: { type: 'integer', example: 42 },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;
