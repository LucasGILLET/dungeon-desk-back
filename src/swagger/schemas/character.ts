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
          magicItem: { ...nullableIndex('cloak-of-elvenkind'), description: 'Objet magique du SRD (à la place de equipment)' },
          name: { type: 'string', nullable: true, description: 'Objet libre (butin…), ou nom personnalisé' },
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

const refName = { type: 'object', required: ['index', 'name'], properties: { index: { type: 'string' }, name: { type: 'string' } } } as const;

export const characterSheetSchema = {
  type: 'object',
  description: 'Valeurs calculées (jamais stockées)',
  required: ['level', 'proficiencyBonus', 'maxHitPoints', 'abilityScores', 'pending', 'proficiencies', 'expertise', 'languages'],
  properties: {
    level: { type: 'integer' },
    proficiencyBonus: { type: 'integer' },
    maxHitPoints: { type: 'integer' },
    abilityScores: {
      type: 'object',
      additionalProperties: { type: 'object', required: ['base', 'bonus', 'total', 'modifier'], properties: { base: { type: 'integer' }, bonus: { type: 'integer' }, total: { type: 'integer' }, modifier: { type: 'integer' } } },
    },
    pending: {
      type: 'object',
      description: 'Ce qui reste à choisir',
      required: ['subclasses', 'abilityScoreImprovements', 'choices'],
      properties: {
        subclasses: { type: 'array', items: { type: 'string' } },
        abilityScoreImprovements: { type: 'array', items: { type: 'object', properties: { class: { type: 'string' }, level: { type: 'integer' } } } },
        choices: { type: 'array', items: { type: 'object', required: ['choiceId', 'kind', 'remaining'], properties: { choiceId: { type: 'integer' }, kind: { type: 'string' }, remaining: { type: 'integer' } } } },
      },
    },
    grantedFeatures: { type: 'array', description: 'Capacités accordées par une option choisie (index), ex. colossus-slayer', items: { type: 'string' } },
    grantedTraits: { type: 'array', description: 'Traits raciaux accordés par une option choisie (index)', items: { type: 'string' } },
    grantedTraitDetails: { type: 'array', items: { type: 'object', properties: { index: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' } } } },
    grantedSpells: {
      type: 'array',
      description: 'Sorts accordés sans être choisis dans la liste de classe : traits raciaux, sous-classe (toujours préparés), choix',
      items: {
        type: 'object',
        required: ['index', 'name', 'level', 'source', 'kind', 'ability', 'saveDC', 'attackBonus', 'castAtLevel', 'oncePerLongRest', 'atWill'],
        properties: {
          index: { type: 'string' }, name: { type: 'string' }, level: { type: 'integer' }, source: { type: 'string' }, kind: { type: 'string', enum: ['TRAIT', 'SUBCLASS', 'FEATURE', 'CHOICE'] },
          ability: { type: 'string', nullable: true }, saveDC: { type: 'integer', nullable: true }, attackBonus: { type: 'integer', nullable: true },
          castAtLevel: { type: 'integer', nullable: true }, oncePerLongRest: { type: 'boolean' }, atWill: { type: 'boolean' },
        },
      },
    },
    turnOptions: {
      type: 'array',
      description: 'Capacités, traits et sorts utilisables pendant le tour (en plus des actions de base)',
      items: {
        type: 'object',
        required: ['activation', 'source', 'index', 'name', 'spellLevel'],
        properties: {
          activation: { type: 'string', enum: ['ACTION', 'BONUS_ACTION', 'REACTION'] }, source: { type: 'string', enum: ['FEATURE', 'TRAIT', 'SPELL'] },
          index: { type: 'string' }, name: { type: 'string' }, spellLevel: { type: 'integer', nullable: true },
        },
      },
    },
    damageResistances: {
      type: 'array',
      items: { type: 'object', required: ['damageType', 'name', 'source'], properties: { damageType: { type: 'string' }, name: { type: 'string' }, source: { type: 'string' } } },
    },
    proficiencies: { type: 'array', items: { type: 'object', required: ['index', 'name', 'type'], properties: { index: { type: 'string' }, name: { type: 'string' }, type: { type: 'string', example: 'SKILL' } } } },
    expertise: { type: 'array', items: refName },
    languages: { type: 'array', items: refName },
    hitDice: { type: 'array', items: { type: 'object', properties: { class: { type: 'string' }, die: { type: 'integer' }, total: { type: 'integer' }, used: { type: 'integer' } } } },
    spellSlots: { type: 'array', description: 'Emplacements par niveau de sort (index 0 = niveau 1), multiclassage compris', items: { type: 'integer' } },
    pactSlots: { type: 'object', nullable: true, properties: { level: { type: 'integer' }, count: { type: 'integer' } } },
    spellcasting: { type: 'array', items: { type: 'object', properties: { class: { type: 'string' }, ability: { type: 'string' }, saveDC: { type: 'integer' }, attackBonus: { type: 'integer' } } } },
    armorClass: { type: 'object', properties: { value: { type: 'integer' }, detail: { type: 'string', example: 'Cotte de mailles 16 + Bouclier 2' } } },
    featureResources: {
      type: 'array',
      description: 'Capacités à utilisations limitées (rage, ki, conduit divin…)',
      items: {
        type: 'object',
        properties: {
          feature: { type: 'string', nullable: true }, trait: { type: 'string', nullable: true }, name: { type: 'string' },
          max: { type: 'integer' }, used: { type: 'integer' }, recharge: { type: 'string', enum: ['SHORT', 'LONG'] },
        },
      },
    },
  },
} as const;

export const characterSummarySchema = {
  type: 'object',
  properties: {
    id: { type: 'integer' },
    name: { type: 'string' },
    edition: { type: 'string' },
    race: { type: 'string' },
    subrace: { type: 'string', nullable: true },
    classes: { type: 'array', items: { type: 'object', properties: { class: { type: 'string' }, subclass: { type: 'string', nullable: true }, level: { type: 'integer' } } } },
    level: { type: 'integer' },
    names: { $ref: '#/components/schemas/CharacterNames' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

export const characterNamesSchema = {
  type: 'object',
  description: 'Noms traduits',
  properties: {
    race: { type: 'string', nullable: true },
    subrace: { type: 'string', nullable: true },
    background: { type: 'string', nullable: true },
    classes: { type: 'array', items: { type: 'object', properties: { class: { type: 'string', nullable: true }, subclass: { type: 'string', nullable: true }, level: { type: 'integer' } } } },
  },
} as const;

export const characterSchema = {
  allOf: [
    { $ref: '#/components/schemas/CharacterCreateInput' },
    {
      type: 'object',
      properties: {
        id: { type: 'integer', example: 1 },
        names: { $ref: '#/components/schemas/CharacterNames' },
        sheet: { $ref: '#/components/schemas/CharacterSheet' },
        warnings: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, message: { type: 'string' } } } },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  ],
} as const;

const choiceItemSchema = {
  type: 'object',
  properties: {
    type: { type: 'string', example: 'proficiency' },
    index: { type: 'string', nullable: true, example: 'skill-arcana' },
    name: { type: 'string', example: 'Compétence : Arcanes' },
    quantity: { type: 'integer' },
    bonus: { type: 'integer', nullable: true },
    description: { type: 'string', nullable: true },
  },
} as const;

export const characterPreviewSchema = {
  type: 'object',
  properties: {
    valid: { type: 'boolean', description: 'Le personnage peut être enregistré tel quel' },
    errors: { type: 'array', items: { type: 'object', properties: { path: { type: 'string' }, message: { type: 'string' } } } },
    sheet: { allOf: [{ $ref: '#/components/schemas/CharacterSheet' }], nullable: true },
    choices: {
      type: 'array',
      description: 'Choix accessibles (répondus ou non), dans l\'ordre d\'affichage ; un sous-choix suit l\'option qui l\'ouvre',
      items: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          kind: { type: 'string', example: 'PROFICIENCY' },
          choose: { type: 'integer' },
          description: { type: 'string' },
          source: { type: 'object', properties: { type: { type: 'string', example: 'class' }, index: { type: 'string', nullable: true }, name: { type: 'string', nullable: true } } },
          parentOptionId: { type: 'integer', nullable: true },
          options: {
            type: 'array',
            items: { type: 'object', properties: { id: { type: 'integer' }, label: { type: 'string' }, nestedChoiceId: { type: 'integer', nullable: true }, items: { type: 'array', items: choiceItemSchema } } },
          },
          pool: {
            type: 'object',
            nullable: true,
            properties: {
              type: { type: 'string', enum: ['ANY_LANGUAGE', 'EQUIPMENT_CATEGORY'] },
              category: { type: 'object', nullable: true, properties: { index: { type: 'string' }, name: { type: 'string' } } },
              candidates: { type: 'array', items: { type: 'object', properties: { index: { type: 'string' }, name: { type: 'string' } } } },
            },
          },
        },
      },
    },
    startingEquipment: {
      type: 'object',
      properties: {
        items: { type: 'array', items: { type: 'object', properties: { equipment: { type: 'string', nullable: true }, name: { type: 'string', nullable: true }, quantity: { type: 'integer' } } } },
        currencies: { type: 'object', additionalProperties: { type: 'integer' } },
      },
    },
  },
} as const;
