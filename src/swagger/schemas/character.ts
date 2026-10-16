// Personnage au format d'échange (voir src/characters/input.ts) : données de jeu
// désignées par leur index, choix et options par leur id.

const index = (example: string) => ({ type: 'string', example }) as const;
const nullableIndex = (example: string) => ({ type: 'string', nullable: true, example }) as const;

export const characterLevelSchema = {
  type: 'object',
  required: ['level', 'characterLevel'],
  properties: {
    level: { type: 'integer', minimum: 1, maximum: 20, description: 'Niveau dans la classe', example: 4 },
    characterLevel: { type: 'integer', minimum: 1, maximum: 20, description: 'Ordre de prise, tous niveaux confondus', example: 4 },
    hitPointRoll: { type: 'integer', nullable: true, description: 'Dé de vie lancé ; null = valeur moyenne', example: 5 },
    feat: nullableIndex('grappler'),
    abilityIncreases: {
      type: 'array',
      items: { type: 'object', properties: { ability: index('int'), bonus: { type: 'integer', enum: [1, 2] } } },
    },
  },
} as const;

export const characterCreateInputSchema = {
  type: 'object',
  required: ['name', 'race', 'abilityScores', 'classes'],
  properties: {
    edition: { type: 'string', default: '2014' },
    name: { type: 'string', example: 'Elandra' },
    race: index('elf'),
    subrace: nullableIndex('high-elf'),
    background: nullableIndex('acolyte'),
    alignment: nullableIndex('lawful-good'),
    abilityMethod: { type: 'string', enum: ['STANDARD_ARRAY', 'POINT_BUY', 'ROLLED', 'MANUAL'], default: 'MANUAL' },
    abilityScores: {
      type: 'object',
      description: 'Valeurs de base, avant bonus',
      additionalProperties: { type: 'integer', minimum: 1, maximum: 30 },
      example: { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 },
    },
    classes: {
      type: 'array',
      description: 'Dans l\'ordre de prise : la première est la classe de départ',
      items: {
        type: 'object',
        required: ['class', 'levels'],
        properties: {
          class: index('wizard'),
          subclass: nullableIndex('evocation'),
          hitDiceUsed: { type: 'integer', default: 0 },
          levels: { type: 'array', items: { $ref: '#/components/schemas/CharacterLevel' } },
        },
      },
    },
    choices: {
      type: 'array',
      description: 'Réponses aux choix : une option, ou une langue / un objet de la réserve du choix',
      items: {
        type: 'object',
        required: ['choiceId'],
        properties: { choiceId: { type: 'integer' }, optionId: { type: 'integer', nullable: true }, language: nullableIndex('giant'), equipment: nullableIndex('longsword') },
      },
    },
    spells: {
      type: 'array',
      items: { type: 'object', properties: { spell: index('magic-missile'), class: index('wizard'), prepared: { type: 'boolean' } } },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          equipment: nullableIndex('dagger'),
          name: { type: 'string', nullable: true, description: 'Objet libre (objet magique, butin…)' },
          description: { type: 'string', nullable: true },
          quantity: { type: 'integer', default: 1 },
          equipped: { type: 'boolean' },
          attuned: { type: 'boolean' },
        },
      },
    },
    currencies: { type: 'object', additionalProperties: { type: 'integer' }, example: { GP: 15 } },
    personality: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['PERSONALITY_TRAIT', 'IDEAL', 'BOND', 'FLAW'] },
          optionId: { type: 'integer', nullable: true, description: 'Entrée de la table de l\'historique' },
          text: { type: 'string', nullable: true, description: 'Ou texte libre' },
        },
      },
    },
    conditions: { type: 'array', items: index('poisoned') },
    state: {
      type: 'object',
      properties: {
        experiencePoints: { type: 'integer' },
        currentHitPoints: { type: 'integer', nullable: true, description: 'null = PV au maximum' },
        temporaryHitPoints: { type: 'integer' },
        deathSaveSuccesses: { type: 'integer' },
        deathSaveFailures: { type: 'integer' },
        inspiration: { type: 'boolean' },
        spellSlotsUsed: { type: 'array', items: { type: 'object', properties: { level: { type: 'integer' }, pact: { type: 'boolean' }, used: { type: 'integer' } } } },
        featureUsage: { type: 'array', items: { type: 'object', properties: { feature: nullableIndex('rage'), trait: nullableIndex('breath-weapon'), used: { type: 'integer' } } } },
      },
    },
    appearance: { type: 'string', nullable: true },
    backstory: { type: 'string', nullable: true },
    notes: { type: 'string', nullable: true },
    portraitUrl: { type: 'string', nullable: true },
  },
} as const;

export const characterSchema = {
  allOf: [
    { $ref: '#/components/schemas/CharacterCreateInput' },
    {
      type: 'object',
      properties: {
        id: { type: 'integer', example: 1 },
        names: { type: 'object', description: 'Noms traduits de la race, de l\'historique et des classes' },
        sheet: {
          type: 'object',
          description: 'Valeurs calculées (jamais stockées)',
          properties: {
            level: { type: 'integer' },
            proficiencyBonus: { type: 'integer' },
            maxHitPoints: { type: 'integer' },
            abilityScores: { type: 'object', additionalProperties: { type: 'object', properties: { base: { type: 'integer' }, bonus: { type: 'integer' }, total: { type: 'integer' }, modifier: { type: 'integer' } } } },
            pending: { type: 'object', description: 'Ce qui reste à choisir : sous-classes, augmentations de caractéristique, choix' },
          },
        },
        warnings: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, message: { type: 'string' } } } },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  ],
} as const;
